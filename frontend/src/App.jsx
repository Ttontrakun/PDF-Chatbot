import React, { useState, useRef, useEffect } from 'react';
import { Send, Upload, Trash2, Users, Bot, FileText, Settings, Menu, X, AlertCircle, Loader, User, MessageSquare, Save, Plus, Clock } from 'lucide-react';

const API_URL = 'http://localhost:3001';

const App = () => {
  const [activeTab, setActiveTab] = useState('chat');
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [knowledgeFiles, setKnowledgeFiles] = useState([]);
  const [currentUser] = useState({
    id: 1,
    name: 'Admin User',
    email: 'admin@example.com',
    role: 'admin',
    avatar: 'A'
  });
  
  const [selectedModelId, setSelectedModelId] = useState('claude-sonnet');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  
  const messagesEndRef = useRef(null);
  const profileMenuRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const extractTextFromPDF = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('provider', 'OpenAI');
    formData.append('modelName', 'gpt-4o');

    const response = await fetch(`${API_URL}/api/ocr`, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'OCR failed');
    }

    const data = await response.json();
    return data.text;
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    const pdfFiles = files.filter(f => f.type === 'application/pdf');
    
    if (pdfFiles.length === 0) return;

    setUploadingFile(true);

    for (const file of pdfFiles) {
      try {
        const extractedText = await extractTextFromPDF(file);

        const newFile = {
          id: Date.now() + Math.random(),
          name: file.name,
          size: (file.size / 1024).toFixed(2) + ' KB',
          uploadDate: new Date().toLocaleDateString('th-TH'),
          content: extractedText,
          extractedBy: 'GPT-4O'
        };

        setKnowledgeFiles(prev => [...prev, newFile]);
      } catch (error) {
        alert(`เกิดข้อผิดพลาด: ${file.name}\n${error.message}`);
      }
    }

    setUploadingFile(false);
    e.target.value = '';
  };

  const handleDeleteFile = (fileId) => {
    setKnowledgeFiles(knowledgeFiles.filter(f => f.id !== fileId));
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || knowledgeFiles.length === 0) return;

    const userMsg = { role: 'user', content: inputMessage };
    setMessages([...messages, userMsg]);
    setInputMessage('');
    setIsProcessing(true);

    try {
      const knowledgeContext = knowledgeFiles
        .map(file => `[${file.name}]\n${file.content}`)
        .join('\n\n---\n\n');

      const response = await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: 'OpenAI',
          modelName: 'gpt-4o',
          messages: [{ role: 'user', content: inputMessage }],
          knowledgeContext,
          systemPrompt: 'กรุณาตอบคำถามโดยอ้างอิงจากข้อมูลใน Knowledge Base เท่านั้น'
        })
      });

      if (!response.ok) throw new Error('Chat failed');

      const data = await response.json();
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.response
      }]);

    } catch (error) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `❌ เกิดข้อผิดพลาด: ${error.message}`
      }]);
    }

    setIsProcessing(false);
  };

  const NavItem = ({ icon: Icon, label, tab, badge }) => (
    <button
      onClick={() => setActiveTab(tab)}
      className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-lg transition-colors ${
        activeTab === tab ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700'
      }`}
    >
      <div className="flex items-center gap-3">
        <Icon size={20} />
        <span className="font-medium">{label}</span>
      </div>
      {badge && <span className="bg-red-500 text-white text-xs rounded-full px-2 py-0.5">{badge}</span>}
    </button>
  );

  return (
    <div className="flex h-screen bg-gray-900 text-white">
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'w-64' : 'w-0'} bg-gray-800 transition-all duration-300 overflow-hidden flex flex-col`}>
        <div className="p-4 border-b border-gray-700">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Bot size={24} className="text-blue-500" />
            PDF Chatbot
          </h1>
        </div>
        
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <NavItem icon={Bot} label="Chat" tab="chat" />
          <NavItem icon={FileText} label="Knowledge Base" tab="knowledge" badge={knowledgeFiles.length || null} />
          <NavItem icon={Settings} label="Settings" tab="settings" />
        </nav>

        <div className="p-4 border-t border-gray-700 text-sm text-gray-400">
          <p>Version 1.0.0</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-gray-800 border-b border-gray-700 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-gray-700 rounded-lg">
              {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <h2 className="text-xl font-semibold">
              {activeTab === 'chat' && 'Chat'}
              {activeTab === 'knowledge' && 'Knowledge Base'}
              {activeTab === 'settings' && 'Settings'}
            </h2>
          </div>

          <div className="relative" ref={profileMenuRef}>
            <button onClick={() => setShowProfileMenu(!showProfileMenu)} className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center font-bold hover:bg-blue-700">
              {currentUser.avatar}
            </button>
            
            {showProfileMenu && (
              <div className="absolute right-0 mt-2 w-72 bg-gray-800 rounded-lg shadow-xl border border-gray-700 p-4 z-50">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center font-bold text-lg">
                    {currentUser.avatar}
                  </div>
                  <div>
                    <p className="font-semibold">{currentUser.name}</p>
                    <p className="text-sm text-gray-400">{currentUser.email}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {/* Chat Tab */}
          {activeTab === 'chat' && (
            <div className="max-w-4xl mx-auto h-full flex flex-col">
              <div className="flex-1 overflow-auto mb-4 space-y-4">
                {messages.length === 0 ? (
                  <div className="text-center text-gray-400 mt-20">
                    <Bot size={48} className="mx-auto mb-4 text-gray-600" />
                    <p className="text-lg">เริ่มสนทนา</p>
                    {knowledgeFiles.length > 0 && (
                      <div className="mt-4 text-green-400">✓ พร้อมตอบจาก {knowledgeFiles.length} ไฟล์</div>
                    )}
                  </div>
                ) : (
                  <>
                    {messages.map((msg, idx) => (
                      <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-2xl rounded-2xl px-6 py-3 ${msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-800'}`}>
                          <p className="whitespace-pre-wrap">{msg.content}</p>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </>
                )}
                {isProcessing && (
                  <div className="flex justify-start">
                    <div className="bg-gray-800 rounded-2xl px-6 py-3">
                      <div className="flex gap-2">
                        <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                        <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {knowledgeFiles.length === 0 && (
                <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-3 mb-4 flex items-start gap-3">
                  <AlertCircle size={20} className="text-yellow-500" />
                  <div className="text-sm">
                    <p className="font-medium text-yellow-500">ยังไม่มี Knowledge</p>
                    <p className="text-gray-400">อัปโหลด PDF ก่อน</p>
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="พิมพ์คำถาม..."
                  className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500"
                  disabled={isProcessing || knowledgeFiles.length === 0}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={isProcessing || !inputMessage.trim() || knowledgeFiles.length === 0}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 px-6 py-3 rounded-xl"
                >
                  <Send size={20} />
                </button>
              </div>
            </div>
          )}

          {/* Knowledge Base Tab */}
          {activeTab === 'knowledge' && (
            <div className="max-w-4xl mx-auto">
              <div className="bg-gray-800 rounded-lg p-6 mb-6">
                <h3 className="text-lg font-semibold mb-4">อัปโหลด PDF</h3>
                <label className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer ${uploadingFile ? 'border-blue-500 bg-blue-900/20' : 'border-gray-600 hover:border-blue-500'}`}>
                  {uploadingFile ? (
                    <>
                      <Loader size={32} className="text-blue-500 mb-2 animate-spin" />
                      <p className="text-sm text-gray-400">กำลังประมวลผล...</p>
                    </>
                  ) : (
                    <>
                      <Upload size={32} className="text-gray-500 mb-2" />
                      <p className="text-sm text-gray-400">คลิกเพื่อเลือก PDF</p>
                    </>
                  )}
                  <input type="file" accept=".pdf" multiple onChange={handleFileUpload} disabled={uploadingFile} className="hidden" />
                </label>
              </div>

              <div className="bg-gray-800 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4">Files ({knowledgeFiles.length})</h3>
                {knowledgeFiles.length === 0 ? (
                  <p className="text-gray-400 text-center py-8">ยังไม่มีไฟล์</p>
                ) : (
                  <div className="space-y-3">
                    {knowledgeFiles.map(file => (
                      <div key={file.id} className="flex items-center justify-between bg-gray-700 rounded-lg p-4">
                        <div className="flex items-center gap-3 flex-1">
                          <FileText size={24} className="text-blue-500" />
                          <div>
                            <p className="font-medium">{file.name}</p>
                            <p className="text-sm text-gray-400">{file.size} • {file.uploadDate}</p>
                            <p className="text-xs text-green-400">✓ {file.content.length} chars</p>
                          </div>
                        </div>
                        <button onClick={() => handleDeleteFile(file.id)} className="p-2 hover:bg-gray-600 rounded-lg text-red-400">
                          <Trash2 size={18} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div className="max-w-4xl mx-auto">
              <div className="bg-gray-800 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4">การตั้งค่า</h3>
                <p className="text-gray-400">ใช้ GPT-4O สำหรับ OCR และ Chat</p>
                <div className="mt-4 p-4 bg-blue-900/20 border border-blue-700 rounded-lg">
                  <p className="text-sm text-blue-300">
                    ✓ Backend รันที่ localhost:3001<br/>
                    ✓ API Key: sk-YK00iPmAZGRkw5ViTzKhq
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default App;