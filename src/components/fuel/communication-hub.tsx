'use client';

import { useState, useMemo } from 'react';
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
  Briefcase,
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
import { useFuelStore } from '@/store/fuel-store';
import { useToast } from '@/hooks/use-toast';

type Priority = 'low' | 'normal' | 'high' | 'urgent';
type Channel = 'general' | 'shifts' | 'maintenance' | 'management';

interface Message {
  id: string;
  sender: string;
  content: string;
  timestamp: Date;
  priority: Priority;
  channel: Channel;
}

interface Announcement {
  id: string;
  title: string;
  content: string;
  author: string;
  timestamp: Date;
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

const MOCK_SENDERS = ['Admin', 'John M.', 'Sarah K.', 'Peter O.', 'Grace N.', 'David W.'];

function generateInitialMessages(): Message[] {
  const channels: Channel[] = ['general', 'shifts', 'maintenance', 'management'];
  const contents: Record<Channel, string[]> = {
    general: [
      'Reminder: All attendants must wear uniforms during shifts.',
      'New fuel prices effective from tomorrow morning.',
      'Staff meeting scheduled for Friday at 2 PM.',
      'The new POS system update is live. Please restart your terminals.',
      'CCTV maintenance completed. All cameras operational.',
    ],
    shifts: [
      'Morning shift handover complete. All pumps verified.',
      'Need coverage for Saturday evening shift.',
      'Night shift report: All readings normal, no incidents.',
      'Shift swap request: Peter O. and Grace N. for next Monday.',
    ],
    maintenance: [
      'Pump 3 calibration scheduled for this afternoon.',
      'Generator service completed. Auto-switch tested OK.',
      'Tank 2 level sensor needs replacement - ordered.',
      'Fire extinguisher inspection due next week.',
    ],
    management: [
      'Monthly revenue review meeting at 10 AM tomorrow.',
      'New supplier contract signed with Vivo Energy.',
      'Budget approval needed for canopy repairs.',
      'EPRA compliance audit scheduled for next month.',
    ],
  };

  const messages: Message[] = [];
  const now = Date.now();

  for (let i = 0; i < 12; i++) {
    const channel = channels[i % channels.length];
    const channelMessages = contents[channel];
    messages.push({
      id: `msg-${i + 1}`,
      sender: MOCK_SENDERS[Math.floor(Math.random() * MOCK_SENDERS.length)],
      content: channelMessages[i % channelMessages.length],
      timestamp: new Date(now - i * 1800000 - Math.random() * 600000),
      priority: (['normal', 'normal', 'normal', 'high', 'low', 'urgent'] as Priority[])[Math.floor(Math.random() * 6)],
      channel,
    });
  }

  return messages.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
}

const INITIAL_ANNOUNCEMENTS: Announcement[] = [
  {
    id: 'ann-1',
    title: 'Price Change Notice',
    content: 'EPRA has announced new fuel prices effective March 15. Update all pump displays by 6 AM.',
    author: 'Management',
    timestamp: new Date(Date.now() - 3600000),
  },
  {
    id: 'ann-2',
    title: 'Safety Drill',
    content: 'Fire safety drill scheduled for this Saturday at 3 PM. All staff must participate.',
    author: 'Admin',
    timestamp: new Date(Date.now() - 86400000),
  },
  {
    id: 'ann-3',
    title: 'System Maintenance',
    content: 'POS system will undergo maintenance Sunday midnight to 4 AM. Use manual receipts.',
    author: 'IT Department',
    timestamp: new Date(Date.now() - 172800000),
  },
];

export function CommunicationHub() {
  const employees = useFuelStore((s) => s.employees);
  const { toast } = useToast();

  const [messages, setMessages] = useState<Message[]>(generateInitialMessages);
  const [announcements] = useState<Announcement[]>(INITIAL_ANNOUNCEMENTS);
  const [activeChannel, setActiveChannel] = useState<Channel>('general');
  const [newMessage, setNewMessage] = useState('');
  const [messagePriority, setMessagePriority] = useState<Priority>('normal');
  const [recipient, setRecipient] = useState('all');
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [smsEnabled, setSmsEnabled] = useState(false);

  const channels: Channel[] = ['general', 'shifts', 'maintenance', 'management'];

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

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;
    const msg: Message = {
      id: `msg-${Date.now()}`,
      sender: 'You',
      content: newMessage.trim(),
      timestamp: new Date(),
      priority: messagePriority,
      channel: activeChannel,
    };
    setMessages((prev) => [msg, ...prev]);
    setNewMessage('');
    toast({ title: 'Message Sent', description: `Posted in #${activeChannel}` });
  };

  const handleBulkSMS = () => {
    toast({ title: 'Bulk SMS Sent', description: `Message delivered to ${employees.length || 5} staff members` });
  };

  const formatTime = (date: Date) =>
    date.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' });

  const formatDate = (date: Date) =>
    date.toLocaleDateString('en-KE', { month: 'short', day: 'numeric' });

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
              <CardTitle className="text-base flex items-center gap-2">
                <MessageSquare className="size-4 text-amber-400" />
                #{CHANNEL_CONFIG[activeChannel].label} Channel
              </CardTitle>
              <CardDescription className="text-slate-400 text-xs">
                {channelMessages.length} messages
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="max-h-80 overflow-y-auto space-y-3 pr-1">
                {channelMessages.length === 0 ? (
                  <div className="text-center text-slate-500 text-sm py-8">No messages in this channel yet</div>
                ) : (
                  channelMessages.map((msg) => (
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
                        </div>
                        <span className="text-[10px] text-slate-500">
                          {formatDate(msg.timestamp)} {formatTime(msg.timestamp)}
                        </span>
                      </div>
                      <p className="text-sm text-slate-300">{msg.content}</p>
                    </div>
                  ))
                )}
              </div>
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
                disabled={!newMessage.trim()}
                className="bg-amber-500 hover:bg-amber-600 text-black font-semibold"
              >
                <Send className="size-4 mr-2" />
                Send to #{CHANNEL_CONFIG[activeChannel].label}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* ── Right Column ───────────────────────────────────────────── */}
        <div className="space-y-6">
          {/* Announcements */}
          <Card className="bg-slate-800/60 border-slate-700/50 text-white">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Megaphone className="size-4 text-amber-400" />
                Announcements
              </CardTitle>
              <CardDescription className="text-slate-400 text-xs">Station-wide notices</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="max-h-64 overflow-y-auto space-y-3">
                {announcements.map((ann) => (
                  <div
                    key={ann.id}
                    className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-semibold text-amber-300">{ann.title}</span>
                    </div>
                    <p className="text-xs text-slate-300 mb-2">{ann.content}</p>
                    <div className="text-[10px] text-slate-500">
                      {ann.author} · {formatDate(ann.timestamp)} {formatTime(ann.timestamp)}
                    </div>
                  </div>
                ))}
              </div>
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
