import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Edit2, Trash2, Calendar, Users, TrendingUp, TrendingDown, AlertCircle, Shield, X, Upload, Eye } from 'lucide-react';

interface License {
  id: string;
  client_name: string;
  capacity: number;
  license_type: 'webinar' | 'normal';
  taken_on_date: string;
  validity_days: number;
  expiry_date: string;
  purchase_amount: number;
  sold_amount: number;
  purchase_screenshot_url: string;
  sold_screenshot_url: string;
  status: 'active' | 'expired' | 'due';
  reminder_sent: boolean;
  created_at: string;
}

export function LicenseManagement() {
  const [licenses, setLicenses] = useState<License[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingLicense, setEditingLicense] = useState<License | null>(null);

  const [clientName, setClientName] = useState('');
  const [capacity, setCapacity] = useState('');
  const [licenseType, setLicenseType] = useState<'webinar' | 'normal'>('normal');
  const [takenOnDate, setTakenOnDate] = useState(new Date().toISOString().split('T')[0]);
  const [purchaseAmount, setPurchaseAmount] = useState('');
  const [soldAmount, setSoldAmount] = useState('');
  const [purchaseScreenshot, setPurchaseScreenshot] = useState<File | null>(null);
  const [soldScreenshot, setSoldScreenshot] = useState<File | null>(null);
  const [purchaseScreenshotUrl, setPurchaseScreenshotUrl] = useState('');
  const [soldScreenshotUrl, setSoldScreenshotUrl] = useState('');

  useEffect(() => {
    fetchLicenses();

    const subscription = supabase
      .channel('license_updates')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'license_management'
      }, () => {
        fetchLicenses();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchLicenses = async () => {
    const { data } = await supabase
      .from('license_management')
      .select('*')
      .order('taken_on_date', { ascending: false });

    if (data) {
      setLicenses(data);
    }
  };

  const handleScreenshotUpload = async (file: File, type: 'purchase' | 'sold') => {
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result as string;
      if (type === 'purchase') {
        setPurchaseScreenshotUrl(base64String);
      } else {
        setSoldScreenshotUrl(base64String);
      }
    };
    reader.readAsDataURL(file);
  };

  const resetForm = () => {
    setClientName('');
    setCapacity('');
    setLicenseType('normal');
    setTakenOnDate(new Date().toISOString().split('T')[0]);
    setPurchaseAmount('');
    setSoldAmount('');
    setPurchaseScreenshot(null);
    setSoldScreenshot(null);
    setPurchaseScreenshotUrl('');
    setSoldScreenshotUrl('');
    setEditingLicense(null);
    setShowAddForm(false);
  };

  const handleSubmit = async () => {
    if (!clientName || !capacity || !purchaseAmount || !soldAmount) {
      alert('Please fill in all required fields');
      return;
    }

    const licenseData = {
      client_name: clientName,
      capacity: parseInt(capacity),
      license_type: licenseType,
      taken_on_date: takenOnDate,
      validity_days: 30,
      purchase_amount: parseFloat(purchaseAmount),
      sold_amount: parseFloat(soldAmount),
      purchase_screenshot_url: purchaseScreenshotUrl,
      sold_screenshot_url: soldScreenshotUrl
    };

    if (editingLicense) {
      const { error } = await supabase
        .from('license_management')
        .update(licenseData)
        .eq('id', editingLicense.id);

      if (!error) {
        alert('License updated successfully!');
        resetForm();
        fetchLicenses();
      }
    } else {
      const { error } = await supabase
        .from('license_management')
        .insert(licenseData);

      if (!error) {
        alert('License added successfully!');
        resetForm();
        fetchLicenses();
      }
    }
  };

  const handleEdit = (license: License) => {
    setEditingLicense(license);
    setClientName(license.client_name);
    setCapacity(license.capacity.toString());
    setLicenseType(license.license_type);
    setTakenOnDate(license.taken_on_date);
    setPurchaseAmount(license.purchase_amount.toString());
    setSoldAmount(license.sold_amount.toString());
    setPurchaseScreenshotUrl(license.purchase_screenshot_url);
    setSoldScreenshotUrl(license.sold_screenshot_url);
    setShowAddForm(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this license?')) {
      await supabase
        .from('license_management')
        .delete()
        .eq('id', id);

      fetchLicenses();
    }
  };

  const getDaysRemaining = (expiryDate: string) => {
    const today = new Date();
    const expiry = new Date(expiryDate);
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-700 border-green-300';
      case 'due': return 'bg-orange-100 text-orange-700 border-orange-300';
      case 'expired': return 'bg-red-100 text-red-700 border-red-300';
      default: return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const totalPurchase = licenses.reduce((sum, l) => sum + Number(l.purchase_amount), 0);
  const totalSold = licenses.reduce((sum, l) => sum + Number(l.sold_amount), 0);
  const totalProfit = totalSold - totalPurchase;

  return (
    <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl shadow-xl p-6 border-2 border-purple-200">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-3 rounded-xl shadow-lg">
            <Shield size={28} className="text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-gray-900">License Management</h2>
            <p className="text-sm text-gray-600">Track Zoom license purchases and sales</p>
          </div>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-xl transition-all flex items-center gap-2 shadow-lg hover:shadow-xl hover:scale-105"
        >
          <Plus size={20} />
          Add License
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 border-2 border-blue-200 shadow-md">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown size={20} className="text-blue-600" />
            <p className="text-sm font-semibold text-gray-600">Total Purchase</p>
          </div>
          <p className="text-3xl font-black text-blue-600">₹{totalPurchase.toLocaleString('en-IN')}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border-2 border-green-200 shadow-md">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={20} className="text-green-600" />
            <p className="text-sm font-semibold text-gray-600">Total Sold</p>
          </div>
          <p className="text-3xl font-black text-green-600">₹{totalSold.toLocaleString('en-IN')}</p>
        </div>
        <div className={`bg-white rounded-xl p-4 border-2 shadow-md ${totalProfit >= 0 ? 'border-purple-200' : 'border-red-200'}`}>
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle size={20} className={totalProfit >= 0 ? 'text-purple-600' : 'text-red-600'} />
            <p className="text-sm font-semibold text-gray-600">Net Profit</p>
          </div>
          <p className={`text-3xl font-black ${totalProfit >= 0 ? 'text-purple-600' : 'text-red-600'}`}>
            ₹{Math.abs(totalProfit).toLocaleString('en-IN')}
          </p>
        </div>
      </div>

      {showAddForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-900">
                {editingLicense ? 'Edit License' : 'Add New License'}
              </h3>
              <button
                onClick={resetForm}
                className="p-2 hover:bg-gray-100 rounded-lg transition-all"
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Client Name & Email *
                  </label>
                  <input
                    type="text"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none"
                    placeholder="Name - email@example.com"
                  />
                  <p className="text-xs text-gray-500 mt-1">Format: Client Name - email@domain.com</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Capacity *
                  </label>
                  <input
                    type="number"
                    value={capacity}
                    onChange={(e) => setCapacity(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none"
                    placeholder="e.g., 100, 500, 1000"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    License Type *
                  </label>
                  <select
                    value={licenseType}
                    onChange={(e) => setLicenseType(e.target.value as 'webinar' | 'normal')}
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none"
                  >
                    <option value="normal">Normal</option>
                    <option value="webinar">Webinar</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Taken On Date *
                  </label>
                  <input
                    type="date"
                    value={takenOnDate}
                    onChange={(e) => setTakenOnDate(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    License Taken At (INR) *
                  </label>
                  <input
                    type="number"
                    value={purchaseAmount}
                    onChange={(e) => setPurchaseAmount(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                    placeholder="Purchase amount"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    License Sold For (INR) *
                  </label>
                  <input
                    type="number"
                    value={soldAmount}
                    onChange={(e) => setSoldAmount(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none"
                    placeholder="Sold amount"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Purchase Screenshot
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setPurchaseScreenshot(e.target.files[0]);
                        handleScreenshotUpload(e.target.files[0], 'purchase');
                      }
                    }}
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                  />
                  {purchaseScreenshotUrl && (
                    <button
                      onClick={() => window.open(purchaseScreenshotUrl, '_blank')}
                      className="mt-2 text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                    >
                      <Eye size={14} />
                      View Screenshot
                    </button>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Sold Screenshot
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setSoldScreenshot(e.target.files[0]);
                        handleScreenshotUpload(e.target.files[0], 'sold');
                      }
                    }}
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none"
                  />
                  {soldScreenshotUrl && (
                    <button
                      onClick={() => window.open(soldScreenshotUrl, '_blank')}
                      className="mt-2 text-sm text-green-600 hover:text-green-700 flex items-center gap-1"
                    >
                      <Eye size={14} />
                      View Screenshot
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleSubmit}
                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-lg hover:shadow-xl"
              >
                {editingLicense ? 'Update License' : 'Add License'}
              </button>
              <button
                onClick={resetForm}
                className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold rounded-xl transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {licenses.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border-2 border-dashed border-gray-300">
            <Shield size={48} className="mx-auto mb-3 text-gray-300" />
            <p className="text-gray-500 font-medium">No licenses added yet</p>
          </div>
        ) : (
          licenses.map((license) => {
            const daysRemaining = getDaysRemaining(license.expiry_date);
            const profit = Number(license.sold_amount) - Number(license.purchase_amount);

            return (
              <div
                key={license.id}
                className={`bg-white rounded-xl shadow-lg border-2 p-5 hover:shadow-2xl transition-all duration-300 ${
                  license.status === 'expired' ? 'border-red-300' :
                  license.status === 'due' ? 'border-orange-300' : 'border-green-300'
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold text-gray-900">
                        {license.client_name.split(' - ')[0]}
                      </h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold border-2 ${getStatusColor(license.status)}`}>
                        {license.status.toUpperCase()}
                      </span>
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700 border-2 border-blue-300">
                        {license.license_type.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600 flex-wrap">
                      {license.client_name.includes(' - ') && (
                        <div className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded-lg">
                          <span className="font-mono text-xs text-blue-600">
                            {license.client_name.split(' - ')[1]}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <Users size={14} />
                        <span>Capacity: {license.capacity}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar size={14} />
                        <span>Taken: {new Date(license.taken_on_date).toLocaleDateString('en-IN')}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(license)}
                      className="p-2 bg-blue-100 hover:bg-blue-200 rounded-lg transition-all"
                    >
                      <Edit2 size={18} className="text-blue-600" />
                    </button>
                    <button
                      onClick={() => handleDelete(license.id)}
                      className="p-2 bg-red-100 hover:bg-red-200 rounded-lg transition-all"
                    >
                      <Trash2 size={18} className="text-red-600" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-5 gap-3">
                  <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                    <p className="text-xs text-gray-600 mb-1">Purchased At</p>
                    <p className="text-lg font-bold text-blue-600">₹{Number(license.purchase_amount).toLocaleString('en-IN')}</p>
                    {license.purchase_screenshot_url && (
                      <button
                        onClick={() => window.open(license.purchase_screenshot_url, '_blank')}
                        className="mt-1 text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                      >
                        <Eye size={12} />
                        View
                      </button>
                    )}
                  </div>
                  <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                    <p className="text-xs text-gray-600 mb-1">Sold For</p>
                    <p className="text-lg font-bold text-green-600">₹{Number(license.sold_amount).toLocaleString('en-IN')}</p>
                    {license.sold_screenshot_url && (
                      <button
                        onClick={() => window.open(license.sold_screenshot_url, '_blank')}
                        className="mt-1 text-xs text-green-600 hover:text-green-700 flex items-center gap-1"
                      >
                        <Eye size={12} />
                        View
                      </button>
                    )}
                  </div>
                  <div className={`rounded-lg p-3 border ${profit >= 0 ? 'bg-purple-50 border-purple-200' : 'bg-red-50 border-red-200'}`}>
                    <p className="text-xs text-gray-600 mb-1">Profit</p>
                    <p className={`text-lg font-bold ${profit >= 0 ? 'text-purple-600' : 'text-red-600'}`}>
                      ₹{Math.abs(profit).toLocaleString('en-IN')}
                    </p>
                  </div>
                  <div className="bg-orange-50 rounded-lg p-3 border border-orange-200">
                    <p className="text-xs text-gray-600 mb-1">Expiry Date</p>
                    <p className="text-sm font-bold text-orange-600">
                      {new Date(license.expiry_date).toLocaleDateString('en-IN')}
                    </p>
                  </div>
                  <div className={`rounded-lg p-3 border ${
                    daysRemaining <= 0 ? 'bg-red-50 border-red-200' :
                    daysRemaining <= 5 ? 'bg-orange-50 border-orange-200' :
                    'bg-green-50 border-green-200'
                  }`}>
                    <p className="text-xs text-gray-600 mb-1">Days Left</p>
                    <p className={`text-2xl font-black ${
                      daysRemaining <= 0 ? 'text-red-600' :
                      daysRemaining <= 5 ? 'text-orange-600' :
                      'text-green-600'
                    }`}>
                      {daysRemaining <= 0 ? 'EXPIRED' : daysRemaining}
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
