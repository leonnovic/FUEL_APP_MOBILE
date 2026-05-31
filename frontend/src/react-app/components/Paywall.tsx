import { useState, useCallback, useEffect, useRef } from 'react';
import {
  X, Check, Gift, User, Crown, Shield, Zap, Smartphone,
  CreditCard, Lock, AlertTriangle, Loader2,
  CheckCircle2, Calendar, HardDrive, Upload, ArrowRight, Clock
} from 'lucide-react';
import {
  TIERS, type SubscriptionState,
  getSubscription, activateTier, logSubscriptionAction,
} from '@/react-app/lib/subscriptionStore';
import {
  startStripeCheckout, startMpesaStkPush, pollMpesaStatus,
  getToken as getBackendToken,
} from '@/react-app/lib/backendApi';
import { useTrial } from '@/react-app/hooks/useTrial';

interface PaywallProps {
  onClose: () => void;
  currentTier?: string;
}

const TIER_ICONS: Record<string, typeof Gift> = {
  free: Gift,
  staff: User,
  manager: Crown,
  auditor: Shield,
};

function formatPhone(phone: string): string {
  let cleaned = phone.replace(/[\s+-]/g, '');
  if (cleaned.startsWith('0')) cleaned = '254' + cleaned.slice(1);
  if (cleaned.startsWith('+')) cleaned = cleaned.slice(1);
  return cleaned;
}

export default function Paywall({ onClose }: PaywallProps) {
  const [selectedTier, setSelectedTier] = useState<string>('manager');
  const [step, setStep] = useState<'tiers' | 'payment' | 'processing' | 'success'>('tiers');
  const [payMethod, setPayMethod] = useState<'mpesa' | 'stripe'>('mpesa');
  const [phone, setPhone] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState('');
  const [sub, setSub] = useState<SubscriptionState>(getSubscription());
  const modalRef = useRef<HTMLDivElement>(null);
  const { isInTrial, timeDisplayLong, totalSeconds, isPaid } = useTrial();

  useEffect(() => {
    setSub(getSubscription());
  }, []);

  const handleSelectTier = useCallback((key: string) => {
    if (key === 'free') {
      activateTier('free');
      setSub(getSubscription());
      setStep('success');
      return;
    }
    setSelectedTier(key);
    setStep('payment');
  }, []);

  const handleMpesaPayment = useCallback(async () => {
    setError('');
    if (!phone || !/^\+?\d{9,12}$/.test(phone.replace(/[\s-]/g, ''))) {
      setError('Please enter a valid M-PESA phone number (e.g. 0712345678)');
      return;
    }
    if (!agreed) {
      setError('Please agree to the terms to continue');
      return;
    }
    if (!getBackendToken()) {
      setError('Please sign in to your account first so we can confirm your subscription.');
      return;
    }

    setStep('processing');
    const normalizedPhone = formatPhone(phone);

    try {
      const push = await startMpesaStkPush(selectedTier, normalizedPhone);
      const txId = push.tx_id;
      const tierData = TIERS.find(t => t.key === selectedTier);
      if (!tierData) { setError('Plan not found'); setStep('payment'); return; }

      if (push.mocked) {
        // Sandbox / demo — activate locally with DEMO receipt
        const newSub = activateTier(selectedTier, {
          mpesaReceipt: `DEMO-${Date.now()}`,
          phone: normalizedPhone,
        });
        setSub(newSub);
        logSubscriptionAction('activated', selectedTier, 'M-PESA mocked (sandbox)');
        setStep('success');
        return;
      }

      // Real Daraja flow — poll until confirmed
      const startedAt = Date.now();
      const POLL_INTERVAL = 4000;
      const TIMEOUT_MS = 90000;

      const tick = async (): Promise<void> => {
        if (Date.now() - startedAt > TIMEOUT_MS) {
          setError('Payment timed out. If you completed the M-PESA prompt, your subscription will activate within minutes.');
          setStep('payment');
          return;
        }
        try {
          const s = await pollMpesaStatus(txId);
          if (s.payment_status === 'paid') {
            const newSub = activateTier(selectedTier, {
              mpesaReceipt: s.mpesa_receipt || `MPESA${Date.now()}`,
              phone: normalizedPhone,
            });
            setSub(newSub);
            logSubscriptionAction('activated', selectedTier, `M-PESA: ${s.mpesa_receipt}`);
            setStep('success');
            return;
          }
          if (s.payment_status === 'failed') {
            setError(s.result_desc || 'Payment was cancelled or failed. Please try again.');
            setStep('payment');
            return;
          }
          setTimeout(tick, POLL_INTERVAL);
        } catch {
          setTimeout(tick, POLL_INTERVAL);
        }
      };
      setTimeout(tick, POLL_INTERVAL);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'M-PESA push failed. Check your connection and try again.';
      setError(msg);
      setStep('payment');
    }
  }, [phone, agreed, selectedTier]);

  const handleStripePayment = useCallback(async () => {
    setError('');
    if (!getBackendToken()) {
      setError('Please sign in to your account first so we can confirm your subscription.');
      return;
    }
    setStep('processing');
    try {
      const r = await startStripeCheckout(selectedTier, 'monthly');
      window.location.href = r.url;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to start checkout. Please try again.';
      setError(msg);
      setStep('payment');
    }
  }, [selectedTier]);

  const currentTierData = TIERS.find(t => t.key === sub.tier);
  const selectedTierData = TIERS.find(t => t.key === selectedTier);

  const paidTiers = TIERS.filter(t => t.key !== 'free');

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.80)', backdropFilter: 'blur(8px)',
      zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16, fontFamily: 'system-ui, sans-serif',
    }} onClick={(e) => e.target === e.currentTarget && isInTrial && onClose()}>
      <div ref={modalRef} style={{
        background: '#111827', borderRadius: 16, width: '100%', maxWidth: 860,
        maxHeight: '92vh', overflowY: 'auto', border: '1px solid #1f2937',
        boxShadow: '0 25px 50px rgba(0,0,0,0.5)', animation: 'paywallIn 0.3s ease',
      }}>

        {/* Header */}
        <div style={{
          padding: '20px 24px', borderBottom: '1px solid #1f2937',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'linear-gradient(135deg, #111827 0%, #1a2035 100%)',
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Lock size={20} style={{ color: '#f59e0b' }} /> Upgrade FuelPro
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: '#9ca3af' }}>
              {isPaid
                ? 'You have an active subscription'
                : isInTrial
                  ? `⏱ Trial active · ${timeDisplayLong} remaining`
                  : 'Your trial has ended. Choose a plan to keep using FuelPro.'}
            </p>
          </div>
          {/* Only allow close if trial is still active (not expired) */}
          {isInTrial && (
            <button onClick={onClose} style={{
              background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer',
              padding: 6, borderRadius: 8, display: 'flex', alignItems: 'center',
            }} title="Continue with trial">
              <X size={20} />
            </button>
          )}
        </div>

        {/* Trial continue banner — show when trial is still active */}
        {isInTrial && step === 'tiers' && (
          <div style={{
            padding: '10px 24px', background: '#065f4620', borderBottom: '1px solid #065f4640',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Clock size={14} style={{ color: '#34d399' }} />
              <span style={{ fontSize: 12, color: '#34d399', fontWeight: 500 }}>
                You still have {totalSeconds >= 86400
                  ? `${Math.floor(totalSeconds / 86400)} day${Math.floor(totalSeconds / 86400) !== 1 ? 's' : ''}`
                  : timeDisplayLong} left on your free trial.
              </span>
            </div>
            <button onClick={onClose} style={{
              padding: '4px 12px', background: '#065f46', color: '#34d399', border: '1px solid #065f4680',
              borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: 'pointer',
            }}>
              Continue with Trial
            </button>
          </div>
        )}

        {/* ── TIER SELECTION ── */}
        {step === 'tiers' && (
          <div style={{ padding: 24 }}>
            {/* Current plan badge */}
            {currentTierData && (
              <div style={{
                marginBottom: 16, padding: '8px 12px', borderRadius: 10,
                background: `${currentTierData.color}12`, border: `1px solid ${currentTierData.color}25`,
                display: 'flex', alignItems: 'center', gap: 10,
              }}>
                {(() => { const Icon = TIER_ICONS[currentTierData.key] || Gift; return <Icon size={16} style={{ color: currentTierData.color }} />; })()}
                <span style={{ fontSize: 12, color: '#e5e7eb' }}>
                  Current: <strong style={{ color: currentTierData.color }}>{currentTierData.name}</strong>
                  {sub.status === 'trial' && <span style={{ color: '#f59e0b', marginLeft: 8 }}>(Trial)</span>}
                </span>
              </div>
            )}

            {/* Paid plan cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 20 }}>
              {paidTiers.map(tier => {
                const Icon = TIER_ICONS[tier.key] || Gift;
                const isSelected = selectedTier === tier.key;
                const isCurrent = sub.tier === tier.key && sub.status === 'active';
                return (
                  <button
                    key={tier.key}
                    onClick={() => setSelectedTier(tier.key)}
                    style={{
                      padding: 16, borderRadius: 12, background: isSelected ? '#1a2035' : '#0f1117',
                      border: `2px solid ${isSelected ? tier.color : '#1f2937'}`,
                      cursor: 'pointer', transition: 'all 0.18s', textAlign: 'left',
                      display: 'flex', flexDirection: 'column', gap: 8, position: 'relative',
                    }}
                  >
                    {tier.key === 'manager' && (
                      <div style={{
                        position: 'absolute', top: -8, right: 12,
                        background: '#f59e0b', color: '#000', fontSize: 9,
                        fontWeight: 800, padding: '2px 8px', borderRadius: 10,
                        letterSpacing: '0.05em', textTransform: 'uppercase',
                      }}>
                        Popular
                      </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{
                        width: 34, height: 34, borderRadius: 8,
                        background: `${tier.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <Icon size={17} style={{ color: tier.color }} />
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{tier.name}</div>
                        {isCurrent && <span style={{ fontSize: 10, color: tier.color }}>Active plan</span>}
                      </div>
                    </div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: tier.color, lineHeight: 1 }}>
                      Ksh {tier.priceKES.toLocaleString()}
                      <span style={{ fontSize: 11, color: '#6b7280', fontWeight: 400 }}>/mo</span>
                    </div>
                    <div style={{ fontSize: 11, color: '#6b7280' }}>${tier.priceUSD}/mo USD</div>
                    <div style={{ fontSize: 11, color: '#4b5563', lineHeight: 1.4 }}>{tier.description}</div>
                    <div style={{ fontSize: 10, color: '#4b5563', display: 'flex', gap: 8 }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                        <Upload size={9} /> {tier.maxUploads} uploads
                      </span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                        <HardDrive size={9} /> {tier.maxStorage}
                      </span>
                    </div>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
                      {tier.features.slice(0, 4).map((f, i) => (
                        <li key={i} style={{ fontSize: 10, color: '#9ca3af', display: 'flex', alignItems: 'flex-start', gap: 4 }}>
                          <Check size={9} style={{ color: tier.color, marginTop: 2, flexShrink: 0 }} /> {f}
                        </li>
                      ))}
                    </ul>
                    {isSelected && (
                      <div style={{
                        marginTop: 4, padding: '5px 8px', background: `${tier.color}18`,
                        borderRadius: 6, textAlign: 'center', fontSize: 11,
                        fontWeight: 700, color: tier.color,
                      }}>
                        ✓ Selected
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button
                onClick={() => handleSelectTier(selectedTier)}
                style={{
                  flex: 1, minWidth: 140, padding: '12px 16px',
                  background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: '#000',
                  border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}
              >
                <Zap size={15} /> Pay with M-PESA <ArrowRight size={14} />
              </button>
              <button
                onClick={() => { setPayMethod('stripe'); setStep('payment'); }}
                style={{
                  padding: '12px 16px', background: 'transparent', color: '#94a3b8',
                  border: '1px solid #374151', borderRadius: 10, fontSize: 13,
                  fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                }}
              >
                <CreditCard size={14} /> Pay by Card
              </button>
            </div>

            <p style={{ fontSize: 10, color: '#4b5563', textAlign: 'center', marginTop: 12 }}>
              Cancel anytime · No hidden fees · VAT inclusive where applicable
            </p>
          </div>
        )}

        {/* ── PAYMENT STEP ── */}
        {step === 'payment' && selectedTierData && (
          <div style={{ padding: 24 }}>
            <button onClick={() => setStep('tiers')} style={{
              background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer',
              fontSize: 12, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 4,
            }}>
              <ArrowRight size={12} style={{ transform: 'rotate(180deg)' }} /> Back to plans
            </button>

            {/* Order summary */}
            <div style={{
              padding: 16, borderRadius: 12, background: '#0f1117',
              border: `1px solid ${selectedTierData.color}30`, marginBottom: 20,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                {(() => { const Icon = TIER_ICONS[selectedTierData.key] || Gift; return <Icon size={16} style={{ color: selectedTierData.color }} />; })()}
                <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{selectedTierData.name}</span>
              </div>
              <div style={{ fontSize: 26, fontWeight: 800, color: selectedTierData.color }}>
                Ksh {selectedTierData.priceKES.toLocaleString()}
                <span style={{ fontSize: 12, color: '#6b7280', fontWeight: 400 }}>/month</span>
              </div>
              <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>
                ≈ ${selectedTierData.priceUSD}/month USD
              </div>
            </div>

            {/* Payment method tabs */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
              {[
                { id: 'mpesa', label: 'M-PESA', icon: Smartphone },
                { id: 'stripe', label: 'Card / Stripe', icon: CreditCard },
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setPayMethod(id as 'mpesa' | 'stripe')}
                  style={{
                    flex: 1, padding: '10px 14px', borderRadius: 10, fontSize: 13, fontWeight: 600,
                    cursor: 'pointer', transition: 'all 0.15s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    background: payMethod === id ? '#1e293b' : 'transparent',
                    border: `2px solid ${payMethod === id ? '#f59e0b' : '#1f2937'}`,
                    color: payMethod === id ? '#fff' : '#6b7280',
                  }}
                >
                  <Icon size={14} /> {label}
                </button>
              ))}
            </div>

            {payMethod === 'mpesa' && (
              <>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#e5e7eb', marginBottom: 6, display: 'block' }}>
                    <Smartphone size={12} style={{ display: 'inline', marginRight: 4 }} />
                    M-PESA Phone Number
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => { setPhone(e.target.value); setError(''); }}
                    placeholder="0712 345 678 or 2547XXXXXXXX"
                    autoFocus
                    style={{
                      width: '100%', padding: '11px 14px',
                      background: '#0f1117', border: `1.5px solid ${error ? '#ef4444' : '#374151'}`,
                      borderRadius: 10, color: '#fff', fontSize: 14, outline: 'none', boxSizing: 'border-box',
                    }}
                  />
                  <span style={{ fontSize: 10, color: '#4b5563', marginTop: 4, display: 'block' }}>
                    Safaricom numbers only. Format: 0712345678 or 254712345678
                  </span>
                </div>

                <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 16, cursor: 'pointer' }}>
                  <input type="checkbox" checked={agreed} onChange={e => { setAgreed(e.target.checked); setError(''); }} style={{ marginTop: 2 }} />
                  <span style={{ fontSize: 11, color: '#9ca3af', lineHeight: 1.5 }}>
                    I agree to the <a href="#/terms" style={{ color: '#f59e0b' }}>Terms of Service</a> and authorise a
                    Ksh {selectedTierData.priceKES.toLocaleString()} monthly charge via M-PESA
                  </span>
                </label>

                {error && (
                  <div style={{
                    padding: '10px 12px', background: 'rgba(239,68,68,0.08)', borderRadius: 8,
                    marginBottom: 12, fontSize: 12, color: '#f87171',
                    display: 'flex', alignItems: 'flex-start', gap: 6, border: '1px solid rgba(239,68,68,0.2)',
                  }}>
                    <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 1 }} /> {error}
                  </div>
                )}

                <button
                  onClick={handleMpesaPayment}
                  disabled={!phone || !agreed}
                  style={{
                    width: '100%', padding: 14,
                    background: (!phone || !agreed) ? '#374151' : 'linear-gradient(135deg, #16a34a, #15803d)',
                    color: '#fff', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 700,
                    cursor: (!phone || !agreed) ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    transition: 'all 0.15s',
                  }}
                >
                  <Zap size={18} /> Pay Ksh {selectedTierData.priceKES.toLocaleString()} via M-PESA
                </button>

                <p style={{ fontSize: 10, color: '#4b5563', textAlign: 'center', marginTop: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                  <Lock size={10} /> Secured by Safaricom M-PESA · Kenya Data Protection Act 2019 compliant
                </p>
              </>
            )}

            {payMethod === 'stripe' && (
              <>
                {error && (
                  <div style={{
                    padding: '10px 12px', background: 'rgba(239,68,68,0.08)', borderRadius: 8,
                    marginBottom: 12, fontSize: 12, color: '#f87171',
                    display: 'flex', alignItems: 'flex-start', gap: 6, border: '1px solid rgba(239,68,68,0.2)',
                  }}>
                    <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 1 }} /> {error}
                  </div>
                )}

                <div style={{
                  padding: 16, background: '#0f1117', borderRadius: 10,
                  border: '1px solid #1f2937', marginBottom: 16,
                }}>
                  <p style={{ fontSize: 12, color: '#9ca3af', margin: 0, lineHeight: 1.6 }}>
                    You'll be redirected to Stripe's secure checkout to pay with your credit or debit card.
                    After successful payment your subscription will activate automatically.
                  </p>
                </div>

                <button
                  onClick={handleStripePayment}
                  style={{
                    width: '100%', padding: 14,
                    background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                    color: '#fff', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 700,
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  }}
                >
                  <CreditCard size={18} /> Pay ${selectedTierData.priceUSD}/mo with Card
                </button>

                <p style={{ fontSize: 10, color: '#4b5563', textAlign: 'center', marginTop: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                  <Lock size={10} /> Secured by Stripe · 256-bit TLS encryption
                </p>
              </>
            )}
          </div>
        )}

        {/* ── PROCESSING ── */}
        {step === 'processing' && (
          <div style={{ padding: 56, textAlign: 'center' }}>
            {payMethod === 'stripe' ? (
              <>
                <Loader2 size={48} style={{ color: '#6366f1', animation: 'spin 1s linear infinite', marginBottom: 16 }} />
                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#fff', margin: '0 0 8px' }}>Redirecting to Stripe...</h3>
                <p style={{ fontSize: 13, color: '#9ca3af' }}>Preparing your secure checkout</p>
              </>
            ) : (
              <>
                <div style={{ animation: 'pulse 1.5s infinite', marginBottom: 16 }}>
                  <Smartphone size={48} style={{ color: '#f59e0b' }} />
                </div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#fff', margin: '0 0 8px' }}>M-PESA Prompt Sent!</h3>
                <p style={{ fontSize: 13, color: '#9ca3af', margin: '0 0 20px' }}>
                  Check your phone and enter your M-PESA PIN to confirm payment
                </p>
                <div style={{
                  width: '100%', maxWidth: 220, height: 6, background: '#1f2937',
                  borderRadius: 3, overflow: 'hidden', margin: '0 auto',
                }}>
                  <div style={{
                    height: '100%', background: '#f59e0b', borderRadius: 3,
                    animation: 'progressBar 90s linear forwards',
                  }} />
                </div>
                <p style={{ fontSize: 11, color: '#4b5563', marginTop: 12 }}>Waiting for confirmation… (up to 90 seconds)</p>
              </>
            )}
          </div>
        )}

        {/* ── SUCCESS ── */}
        {step === 'success' && selectedTierData && (
          <div style={{ padding: 56, textAlign: 'center' }}>
            <div style={{
              width: 72, height: 72, borderRadius: 36, background: '#10b98120',
              display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px',
              border: '2px solid #10b98130',
            }}>
              <CheckCircle2 size={36} style={{ color: '#10b981' }} />
            </div>
            <h3 style={{ fontSize: 20, fontWeight: 700, color: '#fff', margin: '0 0 8px' }}>
              {selectedTierData.key === 'free' ? 'Trial Activated!' : 'Payment Successful!'}
            </h3>
            <p style={{ fontSize: 13, color: '#9ca3af', margin: '0 0 20px' }}>
              {selectedTierData.key === 'free'
                ? 'Your free trial is now active. Enjoy full access!'
                : `Welcome to ${selectedTierData.name}! Your subscription is now active.`}
            </p>
            {sub.mpesaReceipt && (
              <div style={{
                padding: '8px 16px', background: '#0f1117', borderRadius: 8,
                marginBottom: 20, fontSize: 11, color: '#6b7280', display: 'inline-block',
              }}>
                Receipt: <span style={{ color: '#e5e7eb', fontWeight: 600 }}>{sub.mpesaReceipt}</span>
              </div>
            )}
            <button onClick={onClose} style={{
              padding: '12px 32px', background: 'linear-gradient(135deg, #f59e0b, #d97706)',
              color: '#000', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer',
            }}>
              Go to Dashboard →
            </button>
          </div>
        )}

        {/* Footer */}
        {step === 'tiers' && (
          <div style={{ padding: '12px 24px', borderTop: '1px solid #1f2937', textAlign: 'center' }}>
            <p style={{ fontSize: 10, color: '#4b5563', margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
              <Calendar size={10} /> Cancel anytime · No hidden fees · Powered by Safaricom M-PESA & Stripe
            </p>
          </div>
        )}
      </div>

      <style>{`
        @keyframes paywallIn { from { opacity: 0; transform: scale(0.96) translateY(8px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        @keyframes pulse { 0%,100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.08); opacity: 0.85; } }
        @keyframes progressBar { from { width: 0%; } to { width: 100%; } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
