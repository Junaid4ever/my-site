import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { X, Plus, Calendar, Users, IndianRupee, Trash2, Eye, EyeOff } from 'lucide-react';

interface DueAdjustmentPanelProps {
  isDark: boolean;
  onClose: () => void;
  adminName: string;
}

interface Client {
  id: string;
  name: string;
  price_per_dp_member: number | string;
}

interface Adjustment {
  id: string;
  client_name: string;
  amount: number;
  reason: string;
  date: string;
  created_by: string;
  created_at: string;
}

export function DueAdjustmentPanel({ isDark, onClose, adminName }: DueAdjustmentPanelProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [dpMemberCount, setDpMemberCount] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [adjustments, setAdjustments] = useState<Adjustment[]>([]);
  const [showAdjustments, setShowAdjustments] = useState(true);

  useEffect(() => {
    fetchClients().catch(err => {
      console.error('Error fetching clients:', err);
      alert('Error loading clients: ' + err.message);
    });
    fetchAdjustments();
  }, []);

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, name, price_per_dp_member')
        .eq('role', 'client')
        .order('name');

      if (error) {
        console.error('Supabase error:', error);
        setError('Failed to load clients: ' + error.message);
        return;
      }

      if (data) {
        setClients(data);
      }
    } catch (err: any) {
      console.error('Fetch error:', err);
      setError('Failed to load clients: ' + err.message);
    }
  };

  const fetchAdjustments = async () => {
    const { data } = await supabase
      .from('due_adjustments')
      .select('*')
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });

    if (data) {
      setAdjustments(data);
    }
  };

  const handleDeleteAdjustment = async (adjustment: Adjustment) => {
    if (!confirm(`Delete adjustment of ₹${adjustment.amount} for ${adjustment.client_name}?\n\nThis will recalculate their dues.`)) {
      return;
    }

    const { error } = await supabase
      .from('due_adjustments')
      .delete()
      .eq('id', adjustment.id);

    if (error) {
      alert('Error deleting adjustment: ' + error.message);
      return;
    }

    await supabase.rpc('calculate_daily_dues_for_client', {
      p_client_name: adjustment.client_name,
      p_date: adjustment.date
    });

    alert(`✓ Adjustment deleted and dues recalculated for ${adjustment.client_name}`);
    fetchAdjustments();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedClientId || !dpMemberCount || parseInt(dpMemberCount) <= 0) {
      alert('Please select client and enter valid DP member count');
      return;
    }

    setLoading(true);

    const client = clients.find(c => c.id === selectedClientId);
    if (!client) return;

    const memberCount = parseInt(dpMemberCount);
    const dpRate = typeof client.price_per_dp_member === 'string'
      ? parseFloat(client.price_per_dp_member)
      : (client.price_per_dp_member || 240);
    const amount = memberCount * dpRate;

    const { error: adjustmentError } = await supabase
      .from('due_adjustments')
      .insert({
        client_id: client.id,
        client_name: client.name,
        amount: amount,
        reason: `DP Member: ${memberCount} members @ ₹${dpRate}${notes ? ` - ${notes}` : ''}`,
        date: selectedDate,
        created_by: adminName
      });

    if (adjustmentError) {
      alert('Error adding adjustment: ' + adjustmentError.message);
      setLoading(false);
      return;
    }

    await supabase.rpc('calculate_daily_dues_for_client', {
      p_client_name: client.name,
      p_date: selectedDate
    });

    alert(`✓ Added ${memberCount} DP members (₹${amount}) to ${client.name}'s dues for ${selectedDate}`);

    setSelectedClientId('');
    setDpMemberCount('');
    setNotes('');
    setLoading(false);
    fetchAdjustments();
  };

  const selectedClient = clients.find(c => c.id === selectedClientId);
  const calculatedAmount = selectedClient && dpMemberCount
    ? parseInt(dpMemberCount) * (typeof selectedClient.price_per_dp_member === 'string'
        ? parseFloat(selectedClient.price_per_dp_member)
        : (selectedClient.price_per_dp_member || 240))
    : 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className={`rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto ${
        isDark ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
      }`}>
        <div className={`sticky top-0 z-10 flex items-center justify-between p-6 border-b ${
          isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        }`}>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Users className="text-orange-500" size={28} />
            Add DP Member Adjustment
          </h2>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg transition-colors ${
              isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
            }`}
          >
            <X size={24} />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-4 bg-red-500/20 border-2 border-red-500 rounded-xl">
            <p className="text-red-500 font-semibold">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className={`block text-sm font-semibold mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              Select Client *
            </label>
            <select
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(e.target.value)}
              className={`w-full px-4 py-3 rounded-xl border-2 font-medium ${
                isDark
                  ? 'bg-gray-700 border-gray-600 text-white'
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
              required
            >
              <option value="">-- Select Client --</option>
              {clients.map(client => (
                <option key={client.id} value={client.id}>
                  {client.name} (DP Rate: ₹{client.price_per_dp_member || 240})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={`block text-sm font-semibold mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              Date *
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className={`w-full pl-12 pr-4 py-3 rounded-xl border-2 font-medium ${
                  isDark
                    ? 'bg-gray-700 border-gray-600 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
                required
              />
            </div>
          </div>

          <div>
            <label className={`block text-sm font-semibold mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              DP Member Count *
            </label>
            <input
              type="number"
              value={dpMemberCount}
              onChange={(e) => setDpMemberCount(e.target.value)}
              min="1"
              placeholder="Enter number of DP members"
              className={`w-full px-4 py-3 rounded-xl border-2 font-medium ${
                isDark
                  ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
              }`}
              required
            />
          </div>

          {calculatedAmount > 0 && (
            <div className={`p-4 rounded-xl border-2 ${
              isDark ? 'bg-orange-900/20 border-orange-700' : 'bg-orange-50 border-orange-300'
            }`}>
              <div className="flex items-center justify-between">
                <span className={`font-semibold ${isDark ? 'text-orange-300' : 'text-orange-700'}`}>
                  Total Amount to Add:
                </span>
                <div className="flex items-center gap-2">
                  <IndianRupee size={24} className={isDark ? 'text-orange-400' : 'text-orange-600'} />
                  <span className={`text-2xl font-black ${isDark ? 'text-orange-300' : 'text-orange-600'}`}>
                    {calculatedAmount.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
              <p className={`text-sm mt-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                {dpMemberCount} members × ₹{selectedClient?.price_per_dp_member || 240} per member
              </p>
            </div>
          )}

          <div>
            <label className={`block text-sm font-semibold mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any additional notes..."
              rows={3}
              className={`w-full px-4 py-3 rounded-xl border-2 font-medium resize-none ${
                isDark
                  ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
              }`}
            />
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className={`flex-1 py-3 px-6 rounded-xl font-bold transition-all ${
                isDark
                  ? 'bg-gray-700 hover:bg-gray-600 text-white'
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
              }`}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !selectedClientId || !dpMemberCount}
              className="flex-1 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 disabled:from-gray-400 disabled:to-gray-500 text-white py-3 px-6 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Plus size={20} />
              {loading ? 'Adding...' : 'Add Adjustment'}
            </button>
          </div>
        </form>

        <div className={`border-t p-6 ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
          <button
            onClick={() => setShowAdjustments(!showAdjustments)}
            className={`w-full flex items-center justify-between p-4 rounded-xl font-bold transition-all ${
              isDark ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'
            }`}
          >
            <span className="flex items-center gap-2">
              {showAdjustments ? <EyeOff size={20} /> : <Eye size={20} />}
              All DP Adjustments ({adjustments.length})
            </span>
            <span className="text-sm">
              {showAdjustments ? 'Hide' : 'Show'}
            </span>
          </button>

          {showAdjustments && (
            <div className="mt-4 space-y-3 max-h-96 overflow-y-auto">
              {adjustments.length === 0 ? (
                <p className={`text-center py-8 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  No adjustments yet
                </p>
              ) : (
                adjustments.map((adj) => (
                  <div
                    key={adj.id}
                    className={`p-4 rounded-xl border-2 ${
                      isDark
                        ? 'bg-gray-700 border-gray-600'
                        : 'bg-white border-gray-200'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`font-black text-lg ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            {adj.client_name}
                          </span>
                          <span className={`text-sm px-2 py-1 rounded ${
                            isDark ? 'bg-gray-600 text-gray-300' : 'bg-gray-100 text-gray-600'
                          }`}>
                            {new Date(adj.date).toLocaleDateString('en-IN')}
                          </span>
                        </div>
                        <p className={`text-sm mb-1 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                          {adj.reason}
                        </p>
                        <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                          Added by {adj.created_by} on {new Date(adj.created_at).toLocaleDateString('en-IN')}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="flex items-center gap-1">
                            <IndianRupee size={18} className="text-orange-500" />
                            <span className={`text-xl font-black ${isDark ? 'text-orange-400' : 'text-orange-600'}`}>
                              {adj.amount.toLocaleString('en-IN')}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteAdjustment(adj)}
                          className="bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white p-2 rounded-lg transition-all shadow-lg hover:shadow-xl transform hover:scale-110"
                          title="Delete Adjustment"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
