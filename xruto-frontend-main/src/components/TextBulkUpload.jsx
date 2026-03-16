import React, { useState } from 'react';
import { Copy, FileText, AlertCircle, CheckCircle, X, Loader, Plus } from 'lucide-react';

const TextBulkUpload = ({ onOrdersUploaded }) => {
  const [textInput, setTextInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [error, setError] = useState(null);
  const [previewOrders, setPreviewOrders] = useState([]);

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
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Bulk Text Order Upload</h2>
        <p className="text-gray-600">
          Copy and paste orders directly from Word, Excel, or any text format. 
          Much faster than PDF conversion!
        </p>
      </div>

      {/* Text Input Area */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <label className="block text-sm font-medium text-gray-700">
            Order Text Data
          </label>
          <button
            onClick={insertSample}
            className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
          >
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
          <div className="text-sm text-gray-500">
            {textInput.length} characters
          </div>
          <div className="space-x-2">
            <button
              onClick={handlePreview}
              disabled={isProcessing || !textInput.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
            >
              Preview Orders
            </button>
          </div>
        </div>
      </div>

      {/* Preview Section */}
      {previewOrders.length > 0 && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="text-lg font-medium text-blue-800 mb-3">
            Preview: {previewOrders.length} Orders Found
          </h3>
          
          <div className="max-h-40 overflow-y-auto mb-4">
            {previewOrders.slice(0, 10).map((order, index) => (
              <div key={index} className="text-sm text-blue-700 py-1 border-b border-blue-200 last:border-b-0">
                <strong>{order.customer_name}</strong> - {order.delivery_address} ({order.postcode}) - £{order.order_value}
              </div>
            ))}
            {previewOrders.length > 10 && (
              <div className="text-sm text-blue-600 pt-2">
                ...and {previewOrders.length - 10} more orders
              </div>
            )}
          </div>
          
          <button
            onClick={handleSubmit}
            disabled={isProcessing}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 flex items-center"
          >
            {isProcessing ? (
              <>
                <Loader className="w-4 h-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                Upload {previewOrders.length} Orders
              </>
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
            <button
              onClick={clearResults}
              className="text-red-500 hover:text-red-700 ml-3"
            >
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
              
              <div className="mt-3 text-sm text-green-600">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <strong>Orders Processed:</strong> {uploadResult.extractedCount}
                  </div>
                  <div>
                    <strong>Orders Added:</strong> {uploadResult.insertedCount}
                  </div>
                </div>
              </div>
            </div>
            <button
              onClick={clearResults}
              className="text-green-500 hover:text-green-700 ml-3"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Format Guide */}
      <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <div className="flex items-start">
          <FileText className="w-5 h-5 text-gray-500 mt-0.5 mr-3 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="text-sm font-medium text-gray-800">Required Format</h3>
            <div className="text-sm text-gray-600 mt-2 space-y-1">
              <div>• Start each order with "Order X:" (where X is any number)</div>
              <div>• Use format: "Field: Value" on separate lines</div>
              <div>• Required fields: Customer, Address</div>
              <div>• Optional fields: Email, Phone, Postcode, City, Latitude, Longitude, Value, Weight</div>
              <div>• Separate orders with blank lines</div>
            </div>
            
            <div className="mt-3 text-xs text-gray-500 bg-gray-100 p-2 rounded font-mono">
              Order 1:<br/>
              Customer: John Smith<br/>
              Email: john@email.com<br/>
              Phone: 01925100000<br/>
              Address: 123 Main St, Warrington WA1 2AB<br/>
              Value: £45.99<br/>
              Weight: 2.5kg
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TextBulkUpload;