import React, { useState, useRef } from 'react';
import { Copy, FileText, AlertCircle, CheckCircle, X, Loader, Plus, Upload, Table } from 'lucide-react';

const TextBulkUpload = ({ onOrdersUploaded }) => {
  const [activeTab, setActiveTab] = useState('text'); // 'text' | 'csv'
  const [textInput, setTextInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [error, setError] = useState(null);
  const [previewOrders, setPreviewOrders] = useState([]);
  const csvInputRef = useRef(null);

  const sampleText = `Order 1:
Customer: John Smith
Email: john.smith0@email.com
Phone: 01925100000
Address: 13 Ash Grove, Latchford, Warrington WA4 1EF, UK
Postcode: WA4 1EF
City: Latchford
Latitude: 53.3807489
Longitude: -2.5751915
Value: £45.99
Weight: 2.5kg

Order 2:
Customer: Sarah Wilson
Email: sarah.wilson1@email.com
Phone: 01925100001
Address: 13 Myrtle Grove, Latchford, Warrington WA4 1EE, UK
Postcode: WA4 1EE
City: Latchford
Latitude: 53.3811877
Longitude: -2.5748538
Value: £67.80
Weight: 3.2kg

Order 3:
Customer: Mike Johnson
Email: mike.johnson2@email.com
Phone: 01925100002
Address: 32 Park Ave, Warrington WA4 1DZ, UK
Postcode: WA4 1DZ
City: Warrington
Latitude: 53.3806511
Longitude: -2.5763532
Value: £52.30
Weight: 2.8kg`;

  const parseTextOrders = (text) => {
    const orders = [];
    
    // Split by "Order X:" pattern to get individual orders
    const orderBlocks = text.split(/Order\s+\d+:/i).filter(block => block.trim().length > 0);
    
    orderBlocks.forEach((block, index) => {
      const lines = block.trim().split('\n').map(line => line.trim()).filter(line => line.length > 0);
      
      const order = {
        delivery_date: new Date().toISOString().split('T')[0],
        status: 'pending'
      };
      
      // Parse each line for order data
      lines.forEach(line => {
        const colonIndex = line.indexOf(':');
        if (colonIndex === -1) return;
        
        const key = line.substring(0, colonIndex).trim().toLowerCase();
        const value = line.substring(colonIndex + 1).trim();
        
        switch (key) {
          case 'customer':
            order.customer_name = value;
            break;
          case 'email':
            order.customer_email = value;
            break;
          case 'phone':
            order.customer_phone = value;
            break;
          case 'address':
            order.delivery_address = value;
            break;
          case 'postcode':
            order.postcode = value;
            break;
          case 'city':
            order.city = value;
            break;
          case 'latitude':
            order.latitude = parseFloat(value) || null;
            break;
          case 'longitude':
            order.longitude = parseFloat(value) || null;
            break;
          case 'value':
            // Remove £ symbol and parse
            const cleanValue = value.replace(/[£$,]/g, '');
            order.order_value = parseFloat(cleanValue) || 0;
            break;
          case 'weight':
            // Remove units and parse
            const cleanWeight = value.replace(/[a-zA-Z]/g, '');
            order.weight = parseFloat(cleanWeight) || 0;
            break;
        }
      });
      
      // Validate order has minimum required fields
      if (order.customer_name && order.delivery_address) {
        orders.push(order);
      }
    });
    
    return orders;
  };

  // ── CSV Parsing ─────────────────────────────────────────────────────────────
  // Maps common CSV header variations to internal field names
  const CSV_HEADER_MAP = {
    customer_name: ['customer_name', 'customer', 'name', 'full_name', 'fullname'],
    delivery_address: ['delivery_address', 'address', 'full_address', 'street_address'],
    postcode: ['postcode', 'post_code', 'postal_code', 'zip', 'zipcode'],
    city: ['city', 'town', 'locality'],
    customer_email: ['customer_email', 'email', 'email_address'],
    customer_phone: ['customer_phone', 'phone', 'phone_number', 'mobile', 'telephone'],
    latitude: ['latitude', 'lat'],
    longitude: ['longitude', 'lng', 'lon', 'long'],
    order_value: ['order_value', 'value', 'price', 'amount', 'total', 'order_total'],
    weight: ['weight', 'kg', 'weight_kg'],
    special_instructions: ['special_instructions', 'instructions', 'notes', 'delivery_notes'],
    delivery_date: ['delivery_date', 'date', 'scheduled_date'],
  };

  const parseCSVText = (csvText) => {
    const lines = csvText.trim().split(/\r?\n/).filter((l) => l.trim());
    if (lines.length < 2) return [];

    // Parse header row
    const rawHeaders = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/['"]/g, '').replace(/\s+/g, '_'));

    // Map raw headers to internal field names
    const headerMapping = rawHeaders.map((raw) => {
      for (const [field, variants] of Object.entries(CSV_HEADER_MAP)) {
        if (variants.includes(raw)) return field;
      }
      return raw; // keep as-is if unknown
    });

    const orders = [];
    for (let i = 1; i < lines.length; i++) {
      // Handle quoted commas in CSV
      const cells = [];
      let current = '';
      let inQuotes = false;
      for (const ch of lines[i]) {
        if (ch === '"') { inQuotes = !inQuotes; }
        else if (ch === ',' && !inQuotes) { cells.push(current.trim()); current = ''; }
        else { current += ch; }
      }
      cells.push(current.trim());

      const order = {
        delivery_date: new Date().toISOString().split('T')[0],
        status: 'pending',
      };

      headerMapping.forEach((field, idx) => {
        const val = (cells[idx] || '').replace(/^["']|["']$/g, '').trim();
        if (!val) return;
        if (field === 'latitude' || field === 'longitude') {
          order[field] = parseFloat(val) || null;
        } else if (field === 'order_value') {
          order[field] = parseFloat(val.replace(/[£$,]/g, '')) || 0;
        } else if (field === 'weight') {
          order[field] = parseFloat(val.replace(/[a-zA-Z]/g, '')) || 0;
        } else {
          order[field] = val;
        }
      });

      if (order.customer_name && order.delivery_address) {
        orders.push(order);
      }
    }
    return orders;
  };

  const handleCSVFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setError('Please select a .csv file');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = parseCSVText(ev.target.result);
        if (parsed.length === 0) {
          setError('No valid orders found in CSV. Ensure columns: customer_name, delivery_address, postcode are present.');
          return;
        }
        setPreviewOrders(parsed);
        setError(null);
        setUploadResult(null);
      } catch (err) {
        setError('Failed to parse CSV: ' + err.message);
      }
    };
    reader.readAsText(file);
    // Reset input so same file can be re-selected
    e.target.value = '';
  };

  const handlePreview = () => {
    if (!textInput.trim()) {
      setError('Please enter order text');
      return;
    }

    try {
      const parsed = parseTextOrders(textInput);
      
      if (parsed.length === 0) {
        setError('No valid orders found. Please check the format.');
        return;
      }

      setPreviewOrders(parsed);
      setError(null);
    } catch (error) {
      console.error('Parse error:', error);
      setError('Failed to parse orders. Please check the format.');
    }
  };

  const handleSubmit = async () => {
    if (previewOrders.length === 0) {
      setError('Please preview orders first');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setUploadResult(null);

    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${API_BASE_URL}/orders/upload-text`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ orders: previewOrders })
      });

      const data = await response.json();

      if (data.success) {
        setUploadResult({
          success: true,
          message: data.message,
          extractedCount: previewOrders.length,
          insertedCount: data.insertedCount || previewOrders.length,
          orders: data.orders || previewOrders
        });

        // Notify parent component about new orders
        if (onOrdersUploaded && data.orders) {
          onOrdersUploaded(data.orders);
        }

        // Clear form
        setTextInput('');
        setPreviewOrders([]);
      } else {
        setError(data.message || 'Failed to upload orders');
      }
    } catch (error) {
      console.error('Upload error:', error);
      setError('Failed to upload orders. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const clearResults = () => {
    setUploadResult(null);
    setError(null);
    setPreviewOrders([]);
  };

  const insertSample = () => {
    setTextInput(sampleText);
    setError(null);
    setUploadResult(null);
    setPreviewOrders([]);
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="mb-4">
        <h2 className="text-2xl font-bold text-gray-800 mb-1">Bulk Order Import</h2>
        <p className="text-gray-600 text-sm">
          Import orders via pasted text or CSV file upload.
        </p>
      </div>

      {/* Tab switcher */}
      <div className="flex border-b border-gray-200 mb-6">
        <button
          onClick={() => { setActiveTab('text'); clearResults(); }}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'text' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          <FileText className="w-4 h-4" />
          Paste Text
        </button>
        <button
          onClick={() => { setActiveTab('csv'); clearResults(); }}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'csv' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          <Table className="w-4 h-4" />
          Upload CSV
        </button>
      </div>

      {/* ── TEXT TAB ─────────────────────────────────────── */}
      {activeTab === 'text' && (
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <label className="block text-sm font-medium text-gray-700">Order Text Data</label>
            <button onClick={insertSample} className="text-sm text-blue-600 hover:text-blue-800 flex items-center">
              <Plus className="w-4 h-4 mr-1" />
              Insert Sample
            </button>
          </div>
          <textarea
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder="Paste your orders here in the format shown in the sample..."
            className="w-full h-64 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
            disabled={isProcessing}
          />
          <div className="mt-2 flex justify-between items-center">
            <div className="text-sm text-gray-500">{textInput.length} characters</div>
            <button
              onClick={handlePreview}
              disabled={isProcessing || !textInput.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
            >
              Preview Orders
            </button>
          </div>
        </div>
      )}

      {/* ── CSV TAB ──────────────────────────────────────── */}
      {activeTab === 'csv' && (
        <div className="mb-6">
          {/* Hidden file input */}
          <input
            ref={csvInputRef}
            type="file"
            accept=".csv"
            onChange={handleCSVFile}
            className="hidden"
          />
          {/* Drop zone / click area */}
          <button
            onClick={() => csvInputRef.current?.click()}
            className="w-full border-2 border-dashed border-gray-300 rounded-lg p-10 flex flex-col items-center hover:border-blue-400 hover:bg-blue-50 transition-colors"
          >
            <Upload className="w-10 h-10 text-gray-400 mb-3" />
            <span className="text-gray-700 font-medium">Click to select a CSV file</span>
            <span className="text-gray-400 text-sm mt-1">or drag and drop (.csv, max 5 MB)</span>
          </button>

          {/* CSV format guide */}
          <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-600">
            <p className="font-semibold text-gray-700 mb-1">Expected CSV columns (header row required):</p>
            <code className="block bg-white p-2 rounded border text-gray-800 overflow-x-auto whitespace-nowrap">
              customer_name,delivery_address,postcode,city,latitude,longitude,order_value,weight,customer_phone,customer_email,special_instructions
            </code>
            <p className="mt-2 text-gray-500">Required: <b>customer_name</b>, <b>delivery_address</b>. All others are optional.</p>
          </div>
        </div>
      )}

      {/* Preview Section (shared) */}
      {previewOrders.length > 0 && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="text-lg font-medium text-blue-800 mb-3">
            Preview: {previewOrders.length} Orders Found
          </h3>
          <div className="max-h-40 overflow-y-auto mb-4">
            {previewOrders.slice(0, 10).map((order, index) => (
              <div key={index} className="text-sm text-blue-700 py-1 border-b border-blue-200 last:border-b-0">
                <strong>{order.customer_name}</strong> – {order.delivery_address} ({order.postcode}) – £{Number(order.order_value || 0).toFixed(2)}
              </div>
            ))}
            {previewOrders.length > 10 && (
              <div className="text-sm text-blue-600 pt-2">...and {previewOrders.length - 10} more orders</div>
            )}
          </div>
          <button
            onClick={handleSubmit}
            disabled={isProcessing}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 flex items-center"
          >
            {isProcessing ? (
              <><Loader className="w-4 h-4 mr-2 animate-spin" />Uploading...</>
            ) : (
              <><CheckCircle className="w-4 h-4 mr-2" />Upload {previewOrders.length} Orders</>
            )}
          </button>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start">
            <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 mr-3 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-sm font-medium text-red-800">Upload Error</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
            <button onClick={clearResults} className="text-red-500 hover:text-red-700 ml-3">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Success Display */}
      {uploadResult && uploadResult.success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-start">
            <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-sm font-medium text-green-800">Upload Successful</h3>
              <p className="text-sm text-green-700 mt-1">{uploadResult.message}</p>
              <div className="mt-3 text-sm text-green-600 grid grid-cols-2 gap-4">
                <div><strong>Orders Processed:</strong> {uploadResult.extractedCount}</div>
                <div><strong>Orders Added:</strong> {uploadResult.insertedCount}</div>
              </div>
            </div>
            <button onClick={clearResults} className="text-green-500 hover:text-green-700 ml-3">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Format Guide – text only */}
      {activeTab === 'text' && (
        <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <div className="flex items-start">
            <FileText className="w-5 h-5 text-gray-500 mt-0.5 mr-3 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-sm font-medium text-gray-800">Required Format</h3>
              <div className="text-sm text-gray-600 mt-2 space-y-1">
                <div>• Start each order with "Order X:" (where X is any number)</div>
                <div>• Use format: "Field: Value" on separate lines</div>
                <div>• Required fields: Customer, Address</div>
                <div>• Optional: Email, Phone, Postcode, City, Latitude, Longitude, Value, Weight</div>
              </div>
              <div className="mt-3 text-xs text-gray-500 bg-gray-100 p-2 rounded font-mono">
                Order 1:<br/>
                Customer: John Smith<br/>
                Address: 123 Main St, Warrington WA1 2AB<br/>
                Value: £45.99<br/>
                Weight: 2.5kg
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TextBulkUpload;