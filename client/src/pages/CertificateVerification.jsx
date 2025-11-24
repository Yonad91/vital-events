import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

const CertificateVerification = () => {
  const { certificateId } = useParams();
  const [verificationData, setVerificationData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const verifyCertificate = async () => {
      try {
        const response = await fetch(`/api/certificates/verify/${certificateId}`);
        const data = await response.json();
        
        if (response.ok) {
          setVerificationData(data);
        } else {
          setError(data.message || 'Certificate verification failed');
        }
      } catch (err) {
        setError('Network error occurred');
      } finally {
        setLoading(false);
      }
    };

    if (certificateId) {
      verifyCertificate();
    }
  }, [certificateId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Verifying certificate...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full mx-4">
          <div className="text-center">
            <div className="text-red-500 text-6xl mb-4">✗</div>
            <h1 className="text-2xl font-bold text-gray-800 mb-4">Certificate Verification Failed</h1>
            <p className="text-gray-600 mb-6">{error}</p>
            <p className="text-sm text-gray-500">Certificate ID: {certificateId}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-green-600 text-white p-6">
            <div className="text-center">
              <div className="text-6xl mb-4">✓</div>
              <h1 className="text-3xl font-bold mb-2">Certificate Verified</h1>
              <p className="text-green-100">This certificate is authentic and valid</p>
            </div>
          </div>

          {/* Certificate Details */}
          <div className="p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Certificate Information</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="border-b pb-2">
                  <label className="text-sm font-medium text-gray-500">Certificate ID</label>
                  <p className="text-lg font-semibold text-gray-800">{verificationData.certificateId}</p>
                </div>
                
                <div className="border-b pb-2">
                  <label className="text-sm font-medium text-gray-500">Event Type</label>
                  <p className="text-lg font-semibold text-gray-800 capitalize">{verificationData.eventType}</p>
                </div>
                
                <div className="border-b pb-2">
                  <label className="text-sm font-medium text-gray-500">Registration Number</label>
                  <p className="text-lg font-semibold text-gray-800">{verificationData.registrationNumber}</p>
                </div>
                
                <div className="border-b pb-2">
                  <label className="text-sm font-medium text-gray-500">Issued Date</label>
                  <p className="text-lg font-semibold text-gray-800">
                    {new Date(verificationData.issuedDate).toLocaleDateString()}
                  </p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="border-b pb-2">
                  <label className="text-sm font-medium text-gray-500">Registrar</label>
                  <p className="text-lg font-semibold text-gray-800">{verificationData.registrar}</p>
                </div>
                
                <div className="border-b pb-2">
                  <label className="text-sm font-medium text-gray-500">Requester</label>
                  <p className="text-lg font-semibold text-gray-800">{verificationData.requester}</p>
                </div>
                
                <div className="border-b pb-2">
                  <label className="text-sm font-medium text-gray-500">Event Status</label>
                  <p className="text-lg font-semibold text-gray-800 capitalize">{verificationData.eventData.status}</p>
                </div>
                
                <div className="border-b pb-2">
                  <label className="text-sm font-medium text-gray-500">Event Created</label>
                  <p className="text-lg font-semibold text-gray-800">
                    {new Date(verificationData.eventData.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>

            {/* QR Code Info */}
            <div className="mt-8 p-4 bg-blue-50 rounded-lg">
              <h3 className="text-lg font-semibold text-blue-800 mb-2">QR Code Verification</h3>
              <p className="text-blue-700">
                This certificate contains a QR code that can be scanned to verify its authenticity. 
                The QR code contains encrypted data that links to this verification page.
              </p>
            </div>

            {/* Security Notice */}
            <div className="mt-6 p-4 bg-yellow-50 rounded-lg">
              <h3 className="text-lg font-semibold text-yellow-800 mb-2">Security Notice</h3>
              <p className="text-yellow-700">
                This verification is performed in real-time against our official database. 
                If you have any concerns about the authenticity of this certificate, 
                please contact the Vital Events Registration office.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-6 py-4">
            <div className="text-center text-gray-600">
              <p className="font-semibold">Federal Democratic Republic of Ethiopia</p>
              <p>Vital Events Registration System</p>
              <p className="text-sm mt-2">Verified on {new Date().toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CertificateVerification;
