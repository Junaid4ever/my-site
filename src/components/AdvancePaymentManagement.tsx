import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { X, Plus, Edit2, Save, IndianRupee, Users } from 'lucide-react';

const formatIndianNumber = (num: number | string): string => {
  const n = typeof num === 'string' ? parseFloat(num) : num;
  if (isNaN(n)) return '0';

  const [integer, decimal] = n.toFixed(2).split('.');
  const lastThree = integer.slice(-3);
  const otherNumbers = integer.slice(0, -3);
  const formatted = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + (otherNumbers ? ',' : '') + lastThree;

  return decimal && parseFloat(decimal) > 0 ? `${formatted}.${decimal}` : formatted;
};

interface AdvancePayment {
  id: string;
  client_id: string;
  client_name: string;
  advance_amount: number;
  advance_members: number;
  remaining_amount: number;
  remaining_members: number;
  notes?: string;
  screenshot_url?: string;
  settlement_start_date?: string;
  settlement_end_date?: string;
  is_active: boolean;
  last_deduction_date?: string;
  created_at: string;
  updated_at: string;
}

interface AdvancePaymentManagementProps {
  isDark: boolean;
  onClose: () => void;
}

export function AdvancePaymentManagement({ isDark, onClose }: AdvancePaymentManagementProps) {
  const [advances, setAdvances] = useState<AdvancePayment[]>([]);
  const [clients, setClients] = useState<{id: string; name: string; price_per_member: number}[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [selectedClientId, setSelectedClientId] = useState('');
  const [advanceAmount, setAdvanceAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const [editAmount, setEditAmount] = useState('');
  const [editNotes, setEditNotes] = useState('');

  useEffect(() => {
    fetchAdvances();
    fetchClients();

    const channel = supabase
      .channel('advance_payments_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'advance_payments' }, () => {
        fetchAdvances();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchAdvances = async () => {
    const { data, error } = await supabase
      .from('advance_payments')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setAdvances(data);
    }
  };

  const fetchClients = async () => {
    const { data, error } = await supabase
      .from('users')
      .select('id, name, price_per_member')
      .eq('role', 'client');

    if (!error && data) {
      setClients(data);
    }
  };

  const addAdvancePayment = async () => {
    if (!selectedClientId || !advanceAmount || parseFloat(advanceAmount) <= 0) {
      alert('Please select client and enter valid amount');
      return;
    }

    if (!screenshot) {
      alert('Please upload payment proof screenshot');
      return;
    }

    const client = clients.find(c => c.id === selectedClientId);
    if (!client) return;

    setUploading(true);

    try {
      const amount = parseFloat(advanceAmount);
      const members = Math.floor(amount / client.price_per_member);

      const fileExt = screenshot.name.split('.').pop();
      const fileName = `advance-${selectedClientId}-${Date.now()}.${fileExt}`;
      const { error: uploadError, data } = await supabase.storage
        .from('meeting-screenshots')
        .upload(`payments/${fileName}`, screenshot);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('meeting-screenshots')
        .getPublicUrl(`payments/${fileName}`);

      const existingAdvance = advances.find(a => a.client_id === selectedClientId);

      if (existingAdvance) {
        const { error } = await supabase
          .from('advance_payments')
          .update({
            advance_amount: existingAdvance.advance_amount + amount,
            advance_members: existingAdvance.advance_members + members,
            remaining_amount: existingAdvance.remaining_amount + amount,
            remaining_members: existingAdvance.remaining_members + members,
            notes: notes || existingAdvance.notes,
            screenshot_url: publicUrl,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingAdvance.id);

        if (error) throw error;

        await supabase.rpc('recalculate_pending_dues_with_advance', {
          p_client_name: client.name,
          p_start_date: null
        });

        alert('Advance payment updated successfully! Pending dues recalculated.');
      } else {
        const today = new Date().toISOString().split('T')[0];

        const { data: advanceData, error: insertError } = await supabase
          .from('advance_payments')
          .insert({
            client_id: selectedClientId,
            client_name: client.name,
            advance_amount: amount,
            advance_members: members,
            remaining_amount: amount,
            remaining_members: members,
            is_active: true,
            settlement_start_date: today,
            screenshot_url: publicUrl,
            notes: notes
          })
          .select()
          .single();

        if (insertError) throw insertError;

        const { data: result, error: rpcError } = await supabase.rpc('apply_advance_with_previous_day_settlement', {
          p_client_name: client.name,
          p_advance_amount: amount,
          p_advance_date: today,
          p_advance_id: advanceData.id,
          p_screenshot_url: publicUrl
        });

        if (rpcError) throw rpcError;

        const res = result as any;
        alert(`Advance payment added successfully!\n\nPayment settled till: ${res.payment_settled_till}\nDues cleared: ₹${res.dues_before_advance}\nAdvance remaining: ₹${res.remaining_advance}`);
      }

      resetForm();
      fetchAdvances();
    } catch (error: any) {
      alert('Error: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const updateAdvance = async (id: string) => {
    if (!editAmount || parseFloat(editAmount) < 0) {
      alert('Please enter valid amount');
      return;
    }

    const advance = advances.find(a => a.id === id);
    if (!advance) return;

    const client = clients.find(c => c.client_id === advance.client_id);
    const rate = client?.price_per_member || 100;

    const newRemaining = parseFloat(editAmount);
    const newMembers = Math.floor(newRemaining / rate);

    const { error } = await supabase
      .from('advance_payments')
      .update({
        remaining_amount: newRemaining,
        remaining_members: newMembers,
        notes: editNotes,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) {
      alert('Error updating advance: ' + error.message);
    } else {
      await supabase.rpc('recalculate_pending_dues_with_advance', {
        p_client_name: advance.client_name,
        p_start_date: null
      });
      setEditingId(null);
      fetchAdvances();
    }
  };

  const deleteAdvance = async (id: string) => {
    if (!confirm('Are you sure you want to delete this advance payment? All settled dues will be restored to their original amounts.')) return;

    const advance = advances.find(a => a.id === id);
    if (!advance) return;

    const { error } = await supabase
      .from('advance_payments')
      .delete()
      .eq('id', id);

    if (error) {
      alert('Error deleting advance: ' + error.message);
    } else {
      await supabase.rpc('restore_dues_after_advance_deletion', {
        p_client_name: advance.client_name
      });
      alert('Advance deleted and all dues restored to original amounts.');
      fetchAdvances();
    }
  };

  const resetForm = () => {
    setSelectedClientId('');
    setAdvanceAmount('');
    setNotes('');
    setScreenshot(null);
    setShowAddForm(false);
  };

  const startEdit = (advance: AdvancePayment) => {
    setEditingId(advance.id);
    setEditAmount(advance.remaining_amount.toString());
    setEditNotes(advance.notes || '');
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col`}>
        <div className={`flex items-center justify-between p-6 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
          <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Advance Payment Management
          </h2>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
          >
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {!showAddForm ? (
            <button
              onClick={() => setShowAddForm(true)}
              className="w-full mb-6 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-all flex items-center justify-center gap-2"
            >
              <Plus size={20} />
              Add Advance Payment
            </button>
          ) : (
            <div className={`mb-6 p-6 rounded-lg border-2 ${isDark ? 'bg-gray-900 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
              <h3 className={`text-lg font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Add New Advance
              </h3>

              <div className="space-y-4">
                <div>
                  <label className={`block text-sm font-semibold mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    Select Client
                  </label>
                  <select
                    value={selectedClientId}
                    onChange={(e) => setSelectedClientId(e.target.value)}
                    className={`w-full px-4 py-2 rounded-lg border ${isDark ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                  >
                    <option value="">Choose a client...</option>
                    {clients.map(client => (
                      <option key={client.id} value={client.id}>
                        {client.name} (₹{client.price_per_member}/member)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={`block text-sm font-semibold mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    Advance Amount (₹)
                  </label>
                  <input
                    type="number"
                    value={advanceAmount}
                    onChange={(e) => setAdvanceAmount(e.target.value)}
                    className={`w-full px-4 py-2 rounded-lg border ${isDark ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                    placeholder="Enter amount"
                  />
                  {selectedClientId && advanceAmount && (
                    <p className={`mt-2 text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                      Equivalent to {Math.floor(parseFloat(advanceAmount) / (clients.find(c => c.id === selectedClientId)?.price_per_member || 1))} members
                    </p>
                  )}
                </div>

                <div>
                  <label className={`block text-sm font-semibold mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    Payment Proof Screenshot *
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setScreenshot(e.target.files?.[0] || null)}
                    className={`w-full px-4 py-2 rounded-lg border ${isDark ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                    required
                  />
                  {screenshot && (
                    <p className={`mt-2 text-sm ${isDark ? 'text-green-400' : 'text-green-600'}`}>
                      ✓ {screenshot.name}
                    </p>
                  )}
                </div>

                <div>
                  <label className={`block text-sm font-semibold mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    Notes (Optional)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className={`w-full px-4 py-2 rounded-lg border ${isDark ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                    rows={2}
                    placeholder="Add any notes..."
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={addAdvancePayment}
                    disabled={uploading}
                    className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-500 text-white font-bold rounded-lg transition-all"
                  >
                    {uploading ? 'Uploading...' : 'Save Advance'}
                  </button>
                  <button
                    onClick={resetForm}
                    className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white font-bold rounded-lg transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-4">
            {advances.length === 0 ? (
              <p className={`text-center py-8 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                No advance payments yet
              </p>
            ) : (
              advances.map(advance => (
                <div
                  key={advance.id}
                  className={`p-4 rounded-lg border ${isDark ? 'bg-gray-900 border-gray-700' : 'bg-gray-50 border-gray-200'}`}
                >
                  {editingId === advance.id ? (
                    <div className="space-y-3">
                      <div className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {advance.client_name}
                      </div>
                      <div>
                        <label className={`block text-sm font-semibold mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                          Remaining Amount (₹)
                        </label>
                        <input
                          type="number"
                          value={editAmount}
                          onChange={(e) => setEditAmount(e.target.value)}
                          className={`w-full px-3 py-2 rounded-lg border ${isDark ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                        />
                      </div>
                      <div>
                        <label className={`block text-sm font-semibold mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                          Notes
                        </label>
                        <textarea
                          value={editNotes}
                          onChange={(e) => setEditNotes(e.target.value)}
                          className={`w-full px-3 py-2 rounded-lg border ${isDark ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                          rows={2}
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => updateAdvance(advance.id)}
                          className="flex-1 px-3 py-2 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition-all flex items-center justify-center gap-2"
                        >
                          <Save size={16} />
                          Save
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white font-bold rounded-lg transition-all"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            {advance.client_name}
                          </h3>
                          {advance.notes && (
                            <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                              {advance.notes}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => startEdit(advance)}
                            className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => deleteAdvance(advance.id)}
                            className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className={`p-3 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
                          <div className={`text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                            Total Advance
                          </div>
                          <div className="flex items-center gap-2">
                            <IndianRupee size={18} className="text-blue-500" />
                            <span className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                              {formatIndianNumber(advance.advance_amount)}
                            </span>
                            <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                              ({formatIndianNumber(advance.advance_members)} members)
                            </span>
                          </div>
                        </div>

                        <div className={`p-3 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
                          <div className={`text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                            Remaining Balance
                          </div>
                          <div className="flex items-center gap-2">
                            <IndianRupee size={18} className="text-green-500" />
                            <span className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                              {formatIndianNumber(advance.remaining_amount)}
                            </span>
                            <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                              ({formatIndianNumber(advance.remaining_members)} members)
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
