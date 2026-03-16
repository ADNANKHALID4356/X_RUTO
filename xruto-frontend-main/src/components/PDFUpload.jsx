import React, { useState, useRef } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle, X, Loader } from 'lucide-react';

const PDFUpload = ({ onOrdersUploaded }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    const pdfFile = files.find(file => file.type === 'application/pdf');
    
    if (pdfFile) {
      handleFileUpload(pdfFile);
    } else {
      setError('Please drop a PDF file');
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleFileUpload = async (file) => {
    if (file.type !== 'application/pdf') {
      setError('Please select a PDF file');
      return;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      setError('File size must be less than 10MB');
      return;
    }

    setIsUploading(true);
    setError(null);
    setUploadResult(null);

    const formData = new FormData();
    formData.append('pdfFile', file);

    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${API_BASE_URL}/orders/upload-pdf`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        setUploadResult({
          success: true,
          message: data.message,
          filename: data.filename,
          extractedCount: data.extractedCount,
          insertedCount: data.insertedCount,
          orders: data.orders
        });

        // Notify parent component about new orders
        if (onOrdersUploaded && data.orders) {
          onOrdersUploaded(data.orders);
        }
      } else {
        setError(data.message || 'Failed to upload PDF');
        if (data.extractedOrders) {
          setUploadResult({
            success: false,
            message: data.message,
            extractedOrders: data.extractedOrders
          });
        }
      }
    } catch (error) {
      console.error('Upload error:', error);
      setError('Failed to upload PDF. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const clearResults = () => {
    setUploadResult(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const generateTestOrders = async () => {
    setIsUploading(true);
    setError(null);
    setUploadResult(null);

    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const fullUrl = `${API_BASE_URL}/orders/test-pdf-parsing`;
      console.log('Making request to:', fullUrl);
      
      const response = await fetch(fullUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      console.log('Response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Response data:', data);

      if (data.success) {
        setUploadResult({
          success: true,
          message: data.message,
          filename: 'test-orders.json',
          extractedCount: data.orders?.length || 0,
          insertedCount: data.orders?.length || 0,
          orders: data.orders
        });

        if (onOrdersUploaded && data.orders) {
          onOrdersUploaded(data.orders);
        }
      } else {
        setError(data.message || 'Failed to generate test orders');
      }
    } catch (error) {
      console.error('Test orders error:', error);
      setError('Failed to generate test orders. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Upload Orders from PDF</h2>
        <p className="text-gray-600">
          Upload a PDF file containing order information. The system will automatically extract 
          customer details, addresses, and create delivery orders.
        </p>
      </div>

      {/* Upload Area */}
      <div
        className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors duration-200 ${
          isDragging
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
        } ${isUploading ? 'pointer-events-none opacity-50' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isUploading && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          onChange={handleFileSelect}
          className="hidden"
          disabled={isUploading}
        />

        {isUploading ? (
          <div className="flex flex-col items-center">
            <Loader className="w-12 h-12 text-blue-500 animate-spin mb-4" />
            <p className="text-lg font-medium text-gray-700">Processing PDF...</p>
            <p className="text-sm text-gray-500">This may take a few moments</p>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <Upload className="w-12 h-12 text-gray-400 mb-4" />
            <p className="text-lg font-medium text-gray-700 mb-2">
              Drop your PDF file here, or click to browse
            </p>
            <p className="text-sm text-gray-500">
              Supports PDF files up to 10MB
            </p>
          </div>
        )}
      </div>

      {/* Test Orders Button */}
      <div className="mt-4 text-center">
        <button
          onClick={generateTestOrders}
          disabled={isUploading}
          className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
        >
          Generate Test Orders
        </button>
        <p className="text-xs text-gray-500 mt-1">
          Create sample orders for testing (no PDF required)
        </p>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
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
        <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-start">
            <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-sm font-medium text-green-800">Upload Successful</h3>
              <p className="text-sm text-green-700 mt-1">{uploadResult.message}</p>
              
              <div className="mt-3 text-sm text-green-600">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <strong>File:</strong> {uploadResult.filename}
                  </div>
                  <div>
                    <strong>Orders Found:</strong> {uploadResult.extractedCount}
                  </div>
                  <div>
                    <strong>Orders Added:</strong> {uploadResult.insertedCount}
                  </div>
                </div>
              </div>

              {uploadResult.orders && uploadResult.orders.length > 0 && (
                <div className="mt-4">
                  <details className="cursor-pointer">
                    <summary className="text-sm font-medium text-green-800 hover:text-green-900">
                      View Uploaded Orders ({uploadResult.orders.length})
                    </summary>
                    <div className="mt-2 max-h-40 overflow-y-auto bg-white rounded border p-2">
                      {uploadResult.orders.slice(0, 10).map((order, index) => (
                        <div key={index} className="text-xs text-gray-600 py-1 border-b last:border-b-0">
                          <strong>{order.customer_name}</strong> - {order.delivery_address} ({order.postcode})
                        </div>
                      ))}
                      {uploadResult.orders.length > 10 && (
                        <div className="text-xs text-gray-500 pt-1">
                          ...and {uploadResult.orders.length - 10} more orders
                        </div>
                      )}
                    </div>
                  </details>
                </div>
              )}
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

      {/* Partial Success (extraction worked, database failed) */}
      {uploadResult && !uploadResult.success && uploadResult.extractedOrders && (
        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-start">
            <AlertCircle className="w-5 h-5 text-yellow-500 mt-0.5 mr-3 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-sm font-medium text-yellow-800">Partial Success</h3>
              <p className="text-sm text-yellow-700 mt-1">
                Orders were extracted from PDF but not saved to database: {uploadResult.message}
              </p>
              
              <div className="mt-3 text-sm text-yellow-600">
                <strong>Extracted Orders:</strong> {uploadResult.extractedOrders.length}
              </div>

              <details className="mt-4 cursor-pointer">
                <summary className="text-sm font-medium text-yellow-800 hover:text-yellow-900">
                  View Extracted Orders
                </summary>
                <div className="mt-2 max-h-40 overflow-y-auto bg-white rounded border p-2">
                  {uploadResult.extractedOrders.slice(0, 10).map((order, index) => (
                    <div key={index} className="text-xs text-gray-600 py-1 border-b last:border-b-0">
                      <strong>{order.customer_name}</strong> - {order.delivery_address} ({order.postcode})
                    </div>
                  ))}
                  {uploadResult.extractedOrders.length > 10 && (
                    <div className="text-xs text-gray-500 pt-1">
                      ...and {uploadResult.extractedOrders.length - 10} more orders
                    </div>
                  )}
                </div>
              </details>
            </div>
            <button
              onClick={clearResults}
              className="text-yellow-500 hover:text-yellow-700 ml-3"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Help Text */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start">
          <FileText className="w-5 h-5 text-blue-500 mt-0.5 mr-3 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="text-sm font-medium text-blue-800">PDF Format Guidelines</h3>
            <ul className="text-sm text-blue-700 mt-2 space-y-1">
              <li>• Include customer names (e.g., "John Smith")</li>
              <li>• Include full addresses with postcodes (e.g., "123 Main Street, City WA4 1EF")</li>
              <li>• Include contact information (emails, phone numbers)</li>
              <li>• Include order values (e.g., "£45.99")</li>
              <li>• Ensure text is readable (not scanned image)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PDFUpload;