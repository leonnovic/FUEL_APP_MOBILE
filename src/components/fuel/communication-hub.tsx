'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  MessageSquare,
  Send,
  Megaphone,
  Phone,
  Mail,
  Bell,
  Hash,
  Radio,
  Clock,
  Wrench,
  AlertTriangle,
  Briefcase,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuthStore } from '@/store/auth-store';
import { useStationStore } from '@/store/station-store';
import { useFuelStore } from '@/store/fuel-store';
import { useToast } from '@/hooks/use-toast';

type Priority = 'low' | 'normal' | 'high' | 'urgent';
type Channel = 'general' | 'shifts' | 'maintenance' | 'management';

interface Message {
  id: string;
  sender: string;
  content: string;
  timestamp: string;
  priority: Priority;
  channel: Channel;
  type: string;
  status: string;
}

const PRIORITY_COLORS: Record<Priority, string> = {
  low: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
  normal: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  high: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  urgent: 'bg-red-500/20 text-red-400 border-red-500/30',
};

const CHANNEL_CONFIG: Record<Channel, { icon: typeof Hash; label: string; color: string }> = {
  general: { icon: Hash, label: 'General', color: 'text-blue-400' },
  shifts: { icon: Clock, label: 'Shifts', color: 'text-green-400' },
  maintenance: { icon: Wrench, label: 'Maintenance', color: 'text-orange-400' },
  management: { icon: Briefcase, label: 'Management', color: 'text-purple-400' },
};

// Map channel to SMS campaign type for API
const CHANNEL_TO_TYPE: Record<Channel, string> = {
  general: 'sms',
  shifts: 'sms',
  maintenance: 'sms',
  management: 'email',
};

// Map priority to subject prefix
const PRIORITY_PREFIX: Record<Priority, string> = {
  low: '[LOW]',
  normal: '',
  high: '[HIGH]',
  urgent: '[URGENT]',
};

export function CommunicationHub() {
  const token = useAuthStore((s) => s.token);
  const currentStation = useStationStore((s) => s.currentStation);
  const employees = useFuelStore((s) => s.employees);
  const user = useAuthStore((s) => s.user);
  const { toast } = useToast();

  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeChannel, setActiveChannel] = useState<Channel>('general');
  const [newMessage, setNewMessage] = useState('');
  const [messagePriority, setMessagePriority] = useState<Priority>('normal');
  const [recipient, setRecipient] = useState('all');
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [smsEnabled, setSmsEnabled] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const channels: Channel[] = ['general', 'shifts', 'maintenance', 'management'];

  // ─── Fetch messages from API ────────────────────────────────────────────

  const fetchMessages = useCallback(async () => {
    if (!token || !currentStation?.id) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/sms-campaigns?stationId=${currentStation.id}&pageSize=100`, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (data.data) {
        const mapped: Message[] = (Array.isArray(data.data) ? data.data : []).map((msg: Record<string, unknown>) => ({
          id: msg.id as string,
          sender: (msg.createdBy as string) || (msg.recipient as string) || 'System',
          content: (msg.content as string) || '',
          timestamp: (msg.createdAt as string) || new Date().toISOString(),
          priority: ((msg.subject as string)?.includes('[URGENT]') ? 'urgent' : (msg.subject as string)?.includes('[HIGH]') ? 'high' : (msg.subject as string)?.includes('[LOW]') ? 'low' : 'normal') as Priority,
          channel: ((msg.type as string) === 'email' ? 'management' : (msg.subject as string)?.includes('[SHIFT]') ? 'shifts' : (msg.subject as string)?.includes('[MAINT]') ? 'maintenance' : 'general') as Channel,
          type: (msg.type as string) || 'sms',
          status: (msg.status as string) || 'pending',
        }));
        setMessages(mapped.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
      } else {
        setMessages([]);
      }
    } catch {
      setError('Failed to load messages. Please try again.');
      setMessages([]);
    } finally {
      setIsLoading(false);
    }
  }, [token, currentStation]);

  useEffect(() => {
    void fetchMessages(); // eslint-disable-line react-hooks/set-state-in-effect
  }, [fetchMessages]);

  // ─── Filtered messages by channel ───────────────────────────────────────

  const channelMessages = useMemo(
    () => messages.filter((m) => m.channel === activeChannel),
    [messages, activeChannel]
  );

  const recipientOptions = useMemo(() => {
    const opts = [{ value: 'all', label: 'All Staff' }];
    employees.forEach((emp) => {
      opts.push({ value: emp.id, label: emp.name });
    });
    return opts;
  }, [employees]);

  // ─── Send message via API ───────────────────────────────────────────────

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !token || !currentStation?.id) return;
    setIsSending(true);
    try {
      const channelPrefix = activeChannel === 'shifts' ? '[SHIFT] ' : activeChannel === 'maintenance' ? '[MAINT] ' : '';
      const subject = `${PRIORITY_PREFIX[messagePriority]} ${channelPrefix}${activeChannel.charAt(0).toUpperCase() + activeChannel.slice(1)}`;
      const res = await fetch(`/api/sms-campaigns?stationId=${currentStation.id}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: CHANNEL_TO_TYPE[activeChannel],
          recipient: recipient === 'all' ? 'all_staff' : recipient,
          subject,
          content: newMessage.trim(),
          status: 'sent',
        }),
      });
      const data = await res.json();
      if (data.data) {
        const newMsg: Message = {
          id: data.data.id,
          sender: user?.name || 'You',
          content: newMessage.trim(),
          timestamp: data.data.createdAt || new Date().toISOString(),
          priority: messagePriority,
          channel: activeChannel,
          type: CHANNEL_TO_TYPE[activeChannel],
          status: 'sent',
        };
        setMessages((prev) => [newMsg, ...prev]);
        setNewMessage('');
        toast({ title: 'Message Sent', description: `Posted in #${CHANNEL_CONFIG[activeChannel].label}` });
      } else {
        toast({ title: 'Failed to Send', description: data.error || 'Unknown error', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Network Error', description: 'Could not send message', variant: 'destructive' });
    } finally {
      setIsSending(false);
    }
  };

  const handleBulkSMS = () => {
    toast({ title: 'Bulk SMS', description: `Message would be delivered to ${employees.length || 0} staff members` });
  };

  const formatTime = (dateStr: string) =>
    new Date(dateStr).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' });

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-KE', { month: 'short', day: 'numeric' });

  const inputClass = 'bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500';

  return (
    <div className="space-y-6">
      {/* ── Channel Tabs ──────────────────────────────────────────────── */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {channels.map((ch) => {
          const config = CHANNEL_CONFIG[ch];
          const Icon = config.icon;
          const isActive = activeChannel === ch;
          return (
            <Button
              key={ch}
              variant="ghost"
              onClick={() => setActiveChannel(ch)}
              className={`flex items-center gap-2 whitespace-nowrap ${
                isActive
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <Icon className="size-3.5" />
              {config.label}
              {messages.filter((m) => m.channel === ch && m.priority === 'urgent').length > 0 && (
                <span className="size-2 rounded-full bg-red-500" />
              )}
            </Button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Message Feed ──────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="bg-slate-800/60 border-slate-700/50 text-white">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <MessageSquare className="size-4 text-amber-400" />
                    #{CHANNEL_CONFIG[activeChannel].label} Channel
                  </CardTitle>
                  <CardDescription className="text-slate-400 text-xs">
                    {channelMessages.length} messages
                  </CardDescription>
                </div>
                <Button variant="ghost" size="sm" className="text-xs text-slate-400 hover:text-white" onClick={fetchMessages}>
                  <RefreshCw className="size-3 mr-1" /> Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="size-6 text-amber-400 animate-spin" />
                  <span className="ml-2 text-slate-400 text-sm">Loading messages...</span>
                </div>
              ) : error ? (
                <div className="text-center py-8">
                  <AlertTriangle className="size-8 text-red-400 mx-auto mb-2" />
                  <div className="text-sm text-red-300">{error}</div>
                  <Button variant="outline" size="sm" className="mt-3 border-slate-600 text-slate-300" onClick={fetchMessages}>
                    <RefreshCw className="size-3 mr-1" /> Retry
                  </Button>
                </div>
              ) : channelMessages.length === 0 ? (
                <div className="text-center text-slate-500 text-sm py-8">
                  <MessageSquare className="size-8 text-slate-600 mx-auto mb-2" />
                  No messages in this channel yet
                  <div className="text-xs text-slate-600 mt-1">Send a message below to get started</div>
                </div>
              ) : (
                <div className="max-h-80 overflow-y-auto space-y-3 pr-1">
                  {channelMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className="p-3 rounded-lg bg-slate-700/30 hover:bg-slate-700/50 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-amber-300">{msg.sender}</span>
                          <Badge className={`${PRIORITY_COLORS[msg.priority]} text-[10px] px-1.5 py-0 border`}>
                            {msg.priority}
                          </Badge>
                          {msg.status === 'sent' && (
                            <Badge className="text-[10px] bg-green-500/20 text-green-400 border-green-500/30 border px-1 py-0">sent</Badge>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-500">
                          {formatDate(msg.timestamp)} {formatTime(msg.timestamp)}
                        </span>
                      </div>
                      <p className="text-sm text-slate-300">{msg.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── Send Message ──────────────────────────────────────────── */}
          <Card className="bg-slate-800/60 border-slate-700/50 text-white">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Send className="size-4 text-amber-400" />
                Send Message
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-slate-400 text-xs">Recipient</Label>
                  <Select value={recipient} onValueChange={setRecipient}>
                    <SelectTrigger className={inputClass}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700 text-white">
                      {recipientOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-slate-400 text-xs">Priority</Label>
                  <Select value={messagePriority} onValueChange={(v) => setMessagePriority(v as Priority)}>
                    <SelectTrigger className={inputClass}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700 text-white">
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label className="text-slate-400 text-xs">Message</Label>
                <Textarea
                  placeholder="Type your message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className={`${inputClass} min-h-[80px]`}
                />
              </div>
              <Button
                onClick={handleSendMessage}
                disabled={!newMessage.trim() || isSending}
                className="bg-amber-500 hover:bg-amber-600 text-black font-semibold"
              >
                {isSending ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Send className="size-4 mr-2" />}
                Send to #{CHANNEL_CONFIG[activeChannel].label}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* ── Right Column ───────────────────────────────────────────── */}
        <div className="space-y-6">
          {/* Announcements - from recent messages */}
          <Card className="bg-slate-800/60 border-slate-700/50 text-white">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Megaphone className="size-4 text-amber-400" />
                Announcements
              </CardTitle>
              <CardDescription className="text-slate-400 text-xs">Station-wide notices</CardDescription>
            </CardHeader>
            <CardContent>
              {messages.filter((m) => m.priority === 'high' || m.priority === 'urgent').length === 0 ? (
                <div className="text-center text-slate-500 text-sm py-6">
                  <Megaphone className="size-6 text-slate-600 mx-auto mb-2" />
                  No announcements yet
                </div>
              ) : (
                <div className="max-h-64 overflow-y-auto space-y-3">
                  {messages
                    .filter((m) => m.priority === 'high' || m.priority === 'urgent')
                    .slice(0, 5)
                    .map((msg) => (
                      <div
                        key={msg.id}
                        className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-semibold text-amber-300">{msg.content.substring(0, 50)}{msg.content.length > 50 ? '...' : ''}</span>
                        </div>
                        <p className="text-xs text-slate-300 mb-2">{msg.content}</p>
                        <div className="text-[10px] text-slate-500">
                          {msg.sender} · {formatDate(msg.timestamp)} {formatTime(msg.timestamp)}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="bg-slate-800/60 border-slate-700/50 text-white">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Radio className="size-4 text-amber-400" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                variant="outline"
                className="w-full border-slate-600 text-slate-300 hover:bg-slate-700/50 hover:text-white justify-start"
                onClick={handleBulkSMS}
              >
                <Phone className="size-4 mr-2 text-green-400" />
                Send Bulk SMS
              </Button>
              <Button
                variant="outline"
                className={`w-full border-slate-600 justify-start ${
                  emailNotifications
                    ? 'text-blue-400 hover:bg-blue-500/10'
                    : 'text-slate-400 hover:bg-slate-700/50'
                }`}
                onClick={() => {
                  setEmailNotifications(!emailNotifications);
                  toast({
                    title: emailNotifications ? 'Email Notifications Disabled' : 'Email Notifications Enabled',
                    description: emailNotifications
                      ? 'You will no longer receive email alerts'
                      : 'You will now receive email alerts for important messages',
                  });
                }}
              >
                <Mail className="size-4 mr-2" />
                {emailNotifications ? 'Email Alerts: ON' : 'Email Alerts: OFF'}
              </Button>
              <Button
                variant="outline"
                className={`w-full border-slate-600 justify-start ${
                  smsEnabled
                    ? 'text-green-400 hover:bg-green-500/10'
                    : 'text-slate-400 hover:bg-slate-700/50'
                }`}
                onClick={() => {
                  setSmsEnabled(!smsEnabled);
                  toast({
                    title: smsEnabled ? 'SMS Notifications Disabled' : 'SMS Notifications Enabled',
                  });
                }}
              >
                <Bell className="size-4 mr-2" />
                {smsEnabled ? 'SMS Alerts: ON' : 'SMS Alerts: OFF'}
              </Button>
            </CardContent>
          </Card>

          {/* Active Channels Summary */}
          <Card className="bg-slate-800/60 border-slate-700/50 text-white">
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Channel Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {channels.map((ch) => {
                  const config = CHANNEL_CONFIG[ch];
                  const Icon = config.icon;
                  const count = messages.filter((m) => m.channel === ch).length;
                  return (
                    <button
                      key={ch}
                      onClick={() => setActiveChannel(ch)}
                      className={`w-full flex items-center justify-between p-2 rounded-lg transition-colors ${
                        activeChannel === ch
                          ? 'bg-amber-500/20 text-amber-400'
                          : 'hover:bg-slate-700/50 text-slate-400'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Icon className="size-3.5" />
                        <span className="text-xs">{config.label}</span>
                      </div>
                      <Badge className="bg-slate-700/50 text-slate-300 text-[10px] px-1.5 py-0">
                        {count}
                      </Badge>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
