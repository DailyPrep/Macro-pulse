import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const TheVault = () => {
  const [files, setFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileContent, setFileContent] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [uploadStatus, setUploadStatus] = useState('');
  const fileInputRef = useRef(null);

  // Load files from localStorage on mount
  useEffect(() => {
    const savedFiles = localStorage.getItem('vault_files');
    if (savedFiles) {
      try {
        setFiles(JSON.parse(savedFiles));
      } catch (e) {
        console.error('Error loading vault files:', e);
      }
    }
  }, []);

  // Save files to localStorage whenever files change
  useEffect(() => {
    if (files.length > 0) {
      localStorage.setItem('vault_files', JSON.stringify(files));
    }
  }, [files]);

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target.result;
      const newFile = {
        id: Date.now(),
        name: file.name,
        type: file.type,
        size: file.size,
        content: content,
        uploadedAt: new Date().toISOString(),
        category: getFileCategory(file.name)
      };

      setFiles(prev => [...prev, newFile]);
      setUploadStatus(`✅ ${file.name} uploaded successfully`);
      setTimeout(() => setUploadStatus(''), 3000);

      // Clear input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    };

    reader.onerror = () => {
      setUploadStatus('❌ Error reading file');
      setTimeout(() => setUploadStatus(''), 3000);
    };

    reader.readAsText(file);
  };

  const getFileCategory = (filename) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    if (['pdf', 'doc', 'docx'].includes(ext)) return 'Documents';
    if (['xls', 'xlsx', 'csv'].includes(ext)) return 'Data';
    if (['txt', 'md', 'log'].includes(ext)) return 'Text';
    if (['json', 'xml', 'yaml'].includes(ext)) return 'Config';
    return 'Other';
  };

  const handleFileSelect = (file) => {
    setSelectedFile(file);
    setFileContent(file.content);
  };

  const handleFileDelete = (fileId) => {
    if (window.confirm('Delete this file from vault?')) {
      setFiles(prev => prev.filter(f => f.id !== fileId));
      if (selectedFile?.id === fileId) {
        setSelectedFile(null);
        setFileContent('');
      }
    }
  };

  const handleSaveContent = () => {
    if (selectedFile) {
      setFiles(prev => prev.map(f => 
        f.id === selectedFile.id 
          ? { ...f, content: fileContent, updatedAt: new Date().toISOString() }
          : f
      ));
      setSelectedFile(prev => ({ ...prev, content: fileContent, updatedAt: new Date().toISOString() }));
      setUploadStatus('✅ File saved');
      setTimeout(() => setUploadStatus(''), 2000);
    }
  };

  const handleDownload = (file) => {
    const blob = new Blob([file.content], { type: file.type || 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const filteredFiles = files.filter(file => 
    file.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    file.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filesByCategory = filteredFiles.reduce((acc, file) => {
    if (!acc[file.category]) acc[file.category] = [];
    acc[file.category].push(file);
    return acc;
  }, {});

  return (
    <div className="h-full w-full bg-tactical-black text-fluorescent-green font-mono flex flex-col">
      {/* Header */}
      <div className="h-8 border-b border-fluorescent-green bg-[#0a0a0a] flex items-center px-2 text-xs flex-shrink-0">
        <div className="flex items-center gap-4 flex-1">
          <span className="text-fluorescent-green font-bold">THE VAULT</span>
          <span className="text-gray-500">|</span>
          <span className="text-cyan-accent">FILES: {files.length}</span>
          <span className="text-gray-500">|</span>
          <span className="text-gray-400">Storage: Local Browser</span>
        </div>
        <div className="flex items-center gap-2">
          {uploadStatus && (
            <span className={`text-xs ${uploadStatus.includes('✅') ? 'text-fluorescent-green' : 'text-emergency-red'}`}>
              {uploadStatus}
            </span>
          )}
        </div>
      </div>

      {/* Main Content - 2 Column Layout */}
      <div className="flex-1 flex gap-1 p-1 overflow-hidden">
        {/* Left Column - File Browser */}
        <div className="w-1/3 border border-fluorescent-green bg-tactical-black flex flex-col overflow-hidden">
          <div className="h-6 border-b border-fluorescent-green bg-[#0a0a0a] flex items-center px-2 flex-shrink-0">
            <span className="text-xs font-mono font-bold text-safety-orange uppercase">FILE BROWSER</span>
          </div>
          
          {/* Search & Upload */}
          <div className="p-2 border-b border-fluorescent-green space-y-2">
            <input
              type="text"
              placeholder="Search files..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-black border border-fluorescent-green text-fluorescent-green text-xs px-2 py-1 font-mono focus:outline-none focus:border-cyan-accent"
            />
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileUpload}
                className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className="flex-1 px-2 py-1 bg-[rgba(0,255,0,0.1)] border border-fluorescent-green text-fluorescent-green text-xs font-mono cursor-pointer hover:bg-[rgba(0,255,0,0.2)] text-center"
              >
                UPLOAD FILE
              </label>
            </div>
          </div>

          {/* File List */}
          <div className="flex-1 overflow-y-auto p-1">
            {Object.keys(filesByCategory).length > 0 ? (
              Object.entries(filesByCategory).map(([category, categoryFiles]) => (
                <div key={category} className="mb-3">
                  <div className="text-xs font-mono text-cyan-accent font-bold mb-1 px-1">
                    {category} ({categoryFiles.length})
                  </div>
                  <div className="space-y-0.5">
                    {categoryFiles.map((file) => (
                      <div
                        key={file.id}
                        onClick={() => handleFileSelect(file)}
                        className={`p-1.5 text-xs font-mono cursor-pointer border-l-2 transition-colors ${
                          selectedFile?.id === file.id
                            ? 'bg-[rgba(0,255,0,0.1)] border-fluorescent-green'
                            : 'border-transparent hover:bg-black hover:border-fluorescent-green/50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-fluorescent-green truncate flex-1">{file.name}</span>
                          <div className="flex items-center gap-1">
                            <span className="text-gray-500 text-[10px]">
                              {(file.size / 1024).toFixed(1)}KB
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDownload(file);
                              }}
                              className="text-cyan-accent hover:text-fluorescent-green text-[10px] px-1"
                              title="Download"
                            >
                              ↓
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleFileDelete(file.id);
                              }}
                              className="text-emergency-red hover:text-red-400 text-[10px] px-1"
                              title="Delete"
                            >
                              ×
                            </button>
                          </div>
                        </div>
                        <div className="text-[10px] text-gray-500 mt-0.5">
                          {new Date(file.uploadedAt).toLocaleDateString()}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-xs font-mono text-gray-500 p-4 text-center">
                {searchTerm ? 'No files match search' : 'No files in vault. Upload a file to get started.'}
              </div>
            )}
          </div>
        </div>

        {/* Right Column - File Viewer/Editor */}
        <div className="flex-1 border border-fluorescent-green bg-tactical-black flex flex-col overflow-hidden">
          <div className="h-6 border-b border-fluorescent-green bg-[#0a0a0a] flex items-center justify-between px-2 flex-shrink-0">
            <span className="text-xs font-mono font-bold text-safety-orange uppercase">
              {selectedFile ? selectedFile.name : 'FILE VIEWER'}
            </span>
            {selectedFile && (
              <button
                onClick={handleSaveContent}
                className="px-2 py-0.5 bg-[rgba(0,255,0,0.1)] border border-fluorescent-green text-fluorescent-green text-xs font-mono hover:bg-[rgba(0,255,0,0.2)]"
              >
                SAVE
              </button>
            )}
          </div>
          
          <div className="flex-1 overflow-hidden">
            {selectedFile ? (
              <textarea
                value={fileContent}
                onChange={(e) => setFileContent(e.target.value)}
                className="w-full h-full bg-black text-fluorescent-green text-xs font-mono p-3 border-0 focus:outline-none resize-none"
                spellCheck={false}
                placeholder="File content will appear here..."
              />
            ) : (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <div className="text-2xl font-mono text-gray-500 mb-2">📁</div>
                  <div className="text-xs font-mono text-gray-500">
                    Select a file from the browser to view/edit
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* File Info Footer */}
          {selectedFile && (
            <div className="h-8 border-t border-fluorescent-green bg-[#0a0a0a] flex items-center justify-between px-2 text-xs">
              <div className="flex items-center gap-4">
                <span className="text-gray-400">Size: {(selectedFile.size / 1024).toFixed(2)} KB</span>
                <span className="text-gray-400">Type: {selectedFile.type || 'text/plain'}</span>
                <span className="text-gray-400">Category: {selectedFile.category}</span>
              </div>
              <div className="text-gray-500">
                Uploaded: {new Date(selectedFile.uploadedAt).toLocaleString()}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TheVault;
