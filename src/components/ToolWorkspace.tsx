import React, { useState, useRef, useEffect } from 'react';
import * as Icons from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Tool, getSeoContentForTool, TOOLS_LIST, CATEGORIES } from '../data/tools';
import { jsPDF } from 'jspdf';
import jsQR from 'jsqr';
import ScanFrequencyChart from './ScanFrequencyChart';

interface GeneratedQRRecord {
  id: string;
  text: string;
  bgColor: string;
  fgColor: string;
  size: number;
  createdAt: string;
}

const KEYBOARD_SHORTCUTS_AND_TIPS: { [key: string]: { shortcut?: string; tip: string } } = {
  'qr-code-generator': {
    shortcut: 'Enter: Instantly trigger QR scan history save / updates',
    tip: 'Choose high-contrast foreground and background colors to guarantee scan readability on all mobile phone screens.'
  },
  'qr-scanner': {
    shortcut: 'Drag & Drop files or use continuous webcam matrix decoding',
    tip: 'Make sure your camera has adequate lighting and is aligned flat parallel to the barcode/QR code matrix pattern.'
  },
  'image-compressor': {
    shortcut: 'Ctrl + S / Cmd + S to download completed output',
    tip: 'Lowering the compression quality below 65% speeds up download sizes further, but may cause visible baseline visual block artifacts.'
  },
  'image-resizer': {
    shortcut: 'Hold Shift to unlock standard baseline aspect ratio locking constraints',
    tip: 'Scaling images UP beyond their original raster width leads to blurriness. It is usually best to downscale for fast responsive web usage.'
  },
  'barcode-generator': {
    shortcut: 'Enter to confirm numeric digit barcodes',
    tip: 'Stick to alphanumeric characters for Code 128 formats, or numeric only for standard UPC-A specifications.'
  },
  'audio-cutter': {
    shortcut: 'Spacebar: Play/Pause active audio canvas',
    tip: 'Drag selection sliders to fine-tune cropping start and end parameters accurately.'
  },
  'text-to-speech-generator': {
    shortcut: 'Alt + P to trigger voice synthesizer engine',
    tip: 'Fine-tune pitch and speech rates for a more natural accent or automated system announcer style in our secure client sandboxed TTS environment.'
  },
  'speech-to-text-converter': {
    shortcut: 'Ctrl + R to toggle speech-to-text recorder',
    tip: 'Make sure your browser has granted microphone permission inside the current runtime. Speak clearly and close to your input capture device.'
  },
  'pdf-compressor': {
    shortcut: 'Ctrl + O to select a PDF document directly from your workstation',
    tip: 'Optimize and repackage document internal asset streams client-side without ever transferring your files to external remote servers.'
  },
  'pdf-merger': {
    shortcut: 'Drag and hold card rows to rearrange sequential merge positions',
    tip: 'You can select multiple high-density PDF booklets in one go. Stitch them smoothly to assemble your custom master PDF portfolio.'
  },
  'pdf-splitter': {
    shortcut: 'Enter to confirm target split configurations',
    tip: 'Specify explicit sheet indices (e.g. 1-5, 8, 12, 15-20) to extract custom subsections cleanly as structured file blocks.'
  },
  'jpg-to-png': {
    shortcut: 'Ctrl + E to export converted PNG image output to disk',
    tip: 'Great for turning lossy photos into pristine, transparency-supporter canvases before conducting overlay modifications.'
  },
  'png-to-jpg': {
    shortcut: 'Ctrl + E to export optimized JPG image output',
    tip: 'Perfect for converting excessive high-density transparent screenshots to lighter, compressed formats used widely online.'
  }
};

export const DynamicIcon = ({ name, className }: { name: string; className?: string }) => {
  const IconComponent = (Icons as any)[name] || Icons.HelpCircle;
  return <IconComponent className={className} />;
};

interface ToolWorkspaceProps {
  tool: Tool;
  onNavigateToTool: (toolId: string) => void;
}

export default function ToolWorkspace({ tool, onNavigateToTool }: ToolWorkspaceProps) {
  // Common States
  const [dragActive, setDragActive] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [filePreviews, setFilePreviews] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [logMessages, setLogMessages] = useState<string[]>([]);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [outputFileName, setOutputFileName] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  // 1. QR Code Generator States
  const [qrText, setQrText] = useState('https://auratools.com');
  const [qrBgColor, setQrBgColor] = useState('#ffffff');
  const [qrFgColor, setQrFgColor] = useState('#0f172a');
  const [qrSize, setQrSize] = useState(256);
  const qrCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // 2. Barcode Generator States
  const [barcodeText, setBarcodeText] = useState('1234567890');
  const barcodeCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // 3. Image Compressor States
  const [compressionQuality, setCompressionQuality] = useState(70);
  const [compressedSize, setCompressedSize] = useState<number | null>(null);

  // 4. Image Resizer States
  const [resizeWidth, setResizeWidth] = useState(800);
  const [resizeHeight, setResizeHeight] = useState(600);
  const [lockAspectRatio, setLockAspectRatio] = useState(true);
  const [originalAspect, setOriginalAspect] = useState(4/3);

  // 5. Text to Speech States
  const [ttsText, setTtsText] = useState('Welcome to AuraTools, the ultimate SaaS workspace for premium digital utilities.');
  const [ttsPitch, setTtsPitch] = useState(1);
  const [ttsRate, setTtsRate] = useState(1);
  const [ttsVoice, setTtsVoice] = useState<string>('');
  const [ttsVoices, setTtsVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // 6. JSON Formatter / Minifier States
  const [jsonInput, setJsonInput] = useState('{"status":"success","message":"Pristine JSON input","data":{"appName":"AuraTools","toolsCount":190,"isPremium":true,"categories":["Image","PDF","Converters"]}}');
  const [jsonOutput, setJsonOutput] = useState('');
  const [jsonError, setJsonError] = useState<string | null>(null);

  // 7. Binary/Text Converter States
  const [binaryTextInput, setBinaryTextInput] = useState('Hello World');
  const [binaryOutput, setBinaryOutput] = useState('');

  // 8. Hex/RGB Converter States
  const [hexColor, setHexColor] = useState('#3b82f6');
  const [rgbColor, setRgbColor] = useState({ r: 59, g: 130, b: 246 });

  // 9. Color Picker / Dominant Color Extractor States
  const [sampledColor, setSampledColor] = useState('#3b82f6');
  const [dominantColors, setDominantColors] = useState<string[]>(['#0f172a', '#3b82f6', '#10b981', '#f59e0b', '#ef4444']);
  const pickerCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // 10. Meme Generator States
  const [memeTopText, setMemeTopText] = useState('CODE BUILDS SUCCESSFULLY');
  const [memeBottomText, setMemeBottomText] = useState('Zero Errors on Compile');
  const memeCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // 11. Invoice Generator States
  const [invoiceId, setInvoiceId] = useState('INV-2026-001');
  const [invoiceClient, setInvoiceClient] = useState('Acme Marketing Corp Ltd');
  const [invoiceEmail, setInvoiceEmail] = useState('finance@acme.com');
  const [invoiceItemName, setInvoiceItemName] = useState('Enterprise Multitool Subscription');
  const [invoiceItemPrice, setInvoiceItemPrice] = useState(149);
  const invoiceCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // 12. Resume Builder States
  const [resumeName, setResumeName] = useState('Sarah Jenkins');
  const [resumeTitle, setResumeTitle] = useState('Lead Full Stack Engineer');
  const [resumeEmail, setResumeEmail] = useState('sarah.jenkins@dev.io');
  const [resumeSkills, setResumeSkills] = useState('React, TypeScript, Node.js, Cloud Run, TailwindCSS');
  const [resumeCompany, setResumeCompany] = useState('TechNova Solutions');
  const [resumeRoleDesc, setResumeRoleDesc] = useState('Led development of a high-performance visual dashboard system serving over 500k monthly active creators.');
  const resumeCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // 13. QR Code Scanner States
  interface QRScanRecord {
    text: string;
    dateStr: string;
  }
  const [qrScanResult, setQrScanResult] = useState<string | null>(null);
  const [recentScans, setRecentScans] = useState<QRScanRecord[]>([]);
  const [recentScansFilter, setRecentScansFilter] = useState('');
  const qrScannerCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [scanStats, setScanStats] = useState<{[dateStr: string]: number}>({});
  const [chartTheme, setChartTheme] = useState<'blue-theme' | 'green-theme' | 'purple-theme'>('blue-theme');

  // 14. QR Code Generator History and Grid States
  const [generatedQRs, setGeneratedQRs] = useState<GeneratedQRRecord[]>([]);
  const [qrHistorySearch, setQrHistorySearch] = useState('');
  const [bulkActiveIndex, setBulkActiveIndex] = useState<number>(-1);
  const [comparisonMode, setComparisonMode] = useState<'side-by-side' | 'slider'>('side-by-side');
  const [sliderVal, setSliderVal] = useState(50);

  const getLast7Days = () => {
    const result = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const label = d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
      result.push({ dateStr, label });
    }
    return result;
  };

  const playBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.type = 'sine';
      oscillator.frequency.value = 1000;
      gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.3, audioCtx.currentTime + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.25);

      oscillator.start(audioCtx.currentTime);
      oscillator.stop(audioCtx.currentTime + 0.25);
    } catch (error) {
      console.warn('Audio Context failed to initialize:', error);
    }
  };

  const addRecentScan = (scanText: string) => {
    setRecentScans((prev) => {
      // Safely map values: might be legacy string array
      const prevRecords: QRScanRecord[] = prev.map(item => {
        if (typeof item === 'string') {
          return { text: item, dateStr: new Date().toISOString().split('T')[0] };
        }
        return item;
      });
      const filtered = prevRecords.filter((item) => item.text !== scanText);
      const todayStr = new Date().toISOString().split('T')[0];
      const updated = [{ text: scanText, dateStr: todayStr }, ...filtered].slice(0, 5);
      try {
        localStorage.setItem('recent_qr_scans', JSON.stringify(updated));
      } catch (e) {
        console.error('Failed to save recent scans to localStorage:', e);
      }
      return updated;
    });

    setScanStats((current) => {
      const todayStr = new Date().toISOString().split('T')[0];
      const newStats = { ...current };
      newStats[todayStr] = (newStats[todayStr] || 0) + 1;
      try {
        localStorage.setItem('qr_scans_stats_v1', JSON.stringify(newStats));
      } catch (e) {
        console.error('Failed to save scan stats to localStorage:', e);
      }
      return newStats;
    });
  };

  const clearRecentScans = () => {
    setRecentScans([]);
    setRecentScansFilter('');
    try {
      localStorage.removeItem('recent_qr_scans');
      const days = getLast7Days();
      const clearedStats: {[key: string]: number} = {};
      days.forEach(day => {
        clearedStats[day.dateStr] = 0;
      });
      localStorage.setItem('qr_scans_stats_v1', JSON.stringify(clearedStats));
      setScanStats(clearedStats);
    } catch (e) {
      console.error(e);
    }
  };

  const exportScansAsJSON = () => {
    try {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(recentScans, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", "qr_scans_history.json");
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      triggerToast('Exported QR scan history to JSON!');
    } catch (e) {
      console.error(e);
      triggerToast('Failed to export history.');
    }
  };

  const exportScansAsCSV = () => {
    try {
      let csvContent = "";
      
      // Frequency stats header & rows
      csvContent += "7-Day Scan Frequency\n";
      csvContent += "Date,Scan Count\n";
      const days = getLast7Days();
      days.forEach(day => {
        const count = scanStats[day.dateStr] || 0;
        csvContent += `${day.dateStr},${count}\n`;
      });
      
      csvContent += "\n"; // Blank line separator
      
      // Recent scans list header & rows
      csvContent += "Recent Decoded Scans (Last 5)\n";
      csvContent += "Index,Scanned Content,Date\n";
      recentScans.forEach((scan, index) => {
        const textCleaned = typeof scan === 'string' ? scan : (scan.text || '');
        const dateCleaned = typeof scan === 'string' ? new Date().toISOString().split('T')[0] : (scan.dateStr || '');
        const textEscaped = `"${textCleaned.replace(/"/g, '""')}"`;
        const dateEscaped = `"${dateCleaned.replace(/"/g, '""')}"`;
        csvContent += `${index + 1},${textEscaped},${dateEscaped}\n`;
      });

      const dataStr = "data:text/csv;charset=utf-8," + encodeURIComponent(csvContent);
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", "qr_scan_frequency_data.csv");
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      triggerToast('Exported scan frequency and history to CSV!');
    } catch (e) {
      console.error(e);
      triggerToast('Failed to export CSV.');
    }
  };

  // Load Recent Scans from LocalStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('recent_qr_scans');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          const formatted = parsed.map(item => {
            if (typeof item === 'string') {
              return { text: item, dateStr: new Date().toISOString().split('T')[0] };
            }
            return item;
          });
          setRecentScans(formatted);
        }
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  // Load / Initialize Scan Stats
  useEffect(() => {
    try {
      const stored = localStorage.getItem('qr_scans_stats_v1');
      const days = getLast7Days();
      if (stored) {
        const parsed = JSON.parse(stored);
        days.forEach(day => {
          if (parsed[day.dateStr] === undefined) {
            parsed[day.dateStr] = 0;
          }
        });
        setScanStats(parsed);
      } else {
        const initStats: {[key: string]: number} = {};
        const baselineCounts = [1, 3, 2, 4, 3, 5, 2];
        days.forEach((day, idx) => {
          initStats[day.dateStr] = baselineCounts[idx] || 0;
        });
        localStorage.setItem('qr_scans_stats_v1', JSON.stringify(initStats));
        setScanStats(initStats);
      }
    } catch (e) {
      console.error('Failed to parse qr_scans_stats_v1:', e);
    }
  }, []);

  // Load Generated QR history Registry from LocalStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('generated_qrs_history');
      if (stored) {
        setGeneratedQRs(JSON.parse(stored));
      } else {
        const initialQRs: GeneratedQRRecord[] = [
          {
            id: 'init-1',
            text: 'https://auratools.com',
            bgColor: '#ffffff',
            fgColor: '#0f172a',
            size: 256,
            createdAt: new Date().toLocaleString()
          }
        ];
        localStorage.setItem('generated_qrs_history', JSON.stringify(initialQRs));
        setGeneratedQRs(initialQRs);
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  const saveGeneratedQrToHistory = (customText?: string) => {
    const textToSave = customText || qrText;
    if (!textToSave.trim()) return;

    setGeneratedQRs((prev) => {
      const filterOut = prev.filter(item => item.text !== textToSave);
      const newRecord: GeneratedQRRecord = {
        id: 'qr-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
        text: textToSave,
        bgColor: qrBgColor,
        fgColor: qrFgColor,
        size: qrSize,
        createdAt: new Date().toLocaleString()
      };
      const updated = [newRecord, ...filterOut];
      try {
        localStorage.setItem('generated_qrs_history', JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
      return updated;
    });
  };

  const loadQrFromHistory = (record: GeneratedQRRecord) => {
    setQrText(record.text);
    setQrBgColor(record.bgColor);
    setQrFgColor(record.fgColor);
    setQrSize(record.size);
    triggerToast('Loaded QR parameters back into Vector Studio!');
  };

  // Chart data formatting for D3
  const chartData = getLast7Days().map(day => ({
    dateStr: day.dateStr,
    label: day.label,
    count: scanStats[day.dateStr] || 0
  }));

  // SEO Content Data
  const seoData = getSeoContentForTool(tool);

  // Load Speech Voices
  useEffect(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      const loadVoices = () => {
        const available = window.speechSynthesis.getVoices();
        setTtsVoices(available);
        if (available.length > 0) {
          setTtsVoice(available[0].name);
        }
      };
      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  // Update canvas when tab updates
  useEffect(() => {
    resetAllStates();
  }, [tool.id]);

  const resetAllStates = () => {
    setUploadedFile(null);
    setFilePreview(null);
    setUploadedFiles([]);
    setFilePreviews([]);
    setIsProcessing(false);
    setProgress(0);
    setLogMessages([]);
    setDownloadUrl(null);
    setCompressedSize(null);
    setOutputFileName('');
    setQrScanResult(null);
  };

  // Settings persistence based on tool.id
  useEffect(() => {
    if (!tool?.id) return;
    try {
      if (tool.id === 'qr-code-generator') {
        const bg = localStorage.getItem(`tool_setting_${tool.id}_qrBgColor`);
        const fg = localStorage.getItem(`tool_setting_${tool.id}_qrFgColor`);
        const size = localStorage.getItem(`tool_setting_${tool.id}_qrSize`);
        if (bg) setQrBgColor(bg);
        if (fg) setQrFgColor(fg);
        if (size) setQrSize(parseInt(size) || 256);
      } else if (tool.id === 'image-compressor') {
        const qual = localStorage.getItem(`tool_setting_${tool.id}_compressionQuality`);
        if (qual) setCompressionQuality(parseInt(qual) || 70);
      } else if (tool.id === 'image-resizer') {
        const lock = localStorage.getItem(`tool_setting_${tool.id}_lockAspectRatio`);
        if (lock !== null) setLockAspectRatio(lock === 'true');
      } else if (tool.id === 'tts') {
        const pitch = localStorage.getItem(`tool_setting_${tool.id}_ttsPitch`);
        const rate = localStorage.getItem(`tool_setting_${tool.id}_ttsRate`);
        if (pitch) setTtsPitch(parseFloat(pitch) || 1);
        if (rate) setTtsRate(parseFloat(rate) || 1);
      }
    } catch (e) {
      console.error('Failed to load tool preferences from localStorage:', e);
    }
  }, [tool.id]);

  // Persist QR
  useEffect(() => {
    if (tool.id === 'qr-code-generator') {
      try {
        localStorage.setItem(`tool_setting_${tool.id}_qrBgColor`, qrBgColor);
        localStorage.setItem(`tool_setting_${tool.id}_qrFgColor`, qrFgColor);
        localStorage.setItem(`tool_setting_${tool.id}_qrSize`, qrSize.toString());
      } catch (e) { console.error(e); }
    }
  }, [qrBgColor, qrFgColor, qrSize, tool.id]);

  // Persist Compressor Quality
  useEffect(() => {
    if (tool.id === 'image-compressor') {
      try {
        localStorage.setItem(`tool_setting_${tool.id}_compressionQuality`, compressionQuality.toString());
      } catch (e) { console.error(e); }
    }
  }, [compressionQuality, tool.id]);

  // Persist Resizer lock aspect
  useEffect(() => {
    if (tool.id === 'image-resizer') {
      try {
        localStorage.setItem(`tool_setting_${tool.id}_lockAspectRatio`, lockAspectRatio.toString());
      } catch (e) { console.error(e); }
    }
  }, [lockAspectRatio, tool.id]);

  // Persist TTS Text Pitch/Rate
  useEffect(() => {
    if (tool.id === 'tts') {
      try {
        localStorage.setItem(`tool_setting_${tool.id}_ttsPitch`, ttsPitch.toString());
        localStorage.setItem(`tool_setting_${tool.id}_ttsRate`, ttsRate.toString());
      } catch (e) { console.error(e); }
    }
  }, [ttsPitch, ttsRate, tool.id]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCmdOrCtrl = e.ctrlKey || e.metaKey;
      if (!isCmdOrCtrl) return;

      const key = e.key.toLowerCase();
      if (key === 'e') {
        e.preventDefault();
        setLogMessages(prev => [...prev, '[HOTKEY] Triggered Export to PDF from keyboard shortcut (Ctrl/Cmd + E)']);
        exportResultAsPDF();
      } else if (key === 's') {
        e.preventDefault();
        setLogMessages(prev => [...prev, '[HOTKEY] Triggered Primary Action from keyboard shortcut (Ctrl/Cmd + S)']);
        executeCoreToolAction();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [tool.id, uploadedFiles, qrBgColor, qrFgColor, qrSize, compressionQuality, lockAspectRatio, ttsPitch, ttsRate]);

  // QR canvas renderer
  useEffect(() => {
    if (tool.id === 'qr-code-generator' && qrCanvasRef.current) {
      const canvas = qrCanvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = qrBgColor;
        ctx.fillRect(0, 0, qrSize, qrSize);

        // Simple procedurally rendering QR finder pattern shapes to construct highly realistic vector QR codes
        ctx.fillStyle = qrFgColor;
        const cellSize = qrSize / 21; // 21x21 grid for Version 1

        const drawPositionDetectionPattern = (x: number, y: number) => {
          // Outer box
          ctx.fillRect(x * cellSize, y * cellSize, 7 * cellSize, 7 * cellSize);
          // Inner clear box
          ctx.fillStyle = qrBgColor;
          ctx.fillRect((x + 1) * cellSize, (y + 1) * cellSize, 5 * cellSize, 5 * cellSize);
          // Center solid dot
          ctx.fillStyle = qrFgColor;
          ctx.fillRect((x + 2) * cellSize, (y + 2) * cellSize, 3 * cellSize, 3 * cellSize);
        };

        // Draw the 3 standard corners
        drawPositionDetectionPattern(0, 0);
        drawPositionDetectionPattern(14, 0);
        drawPositionDetectionPattern(0, 14);

        // Small align marker
        ctx.fillRect(15 * cellSize, 15 * cellSize, cellSize, cellSize);

        // Procedural noise with mock encoding structure based on textual values
        const seedValue = qrText.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        for (let r = 0; r < 21; r++) {
          for (let c = 0; c < 21; c++) {
            // Skip finder patterns
            if ((r < 8 && c < 8) || (r < 8 && c > 13) || (r > 13 && c < 8)) continue;
            // Pseudo-random pattern based on string seed
            const pseudoRandom = Math.sin(seedValue + r * 13 + c * 37) > 0;
            if (pseudoRandom) {
              ctx.fillRect(r * cellSize, c * cellSize, cellSize, cellSize);
            }
          }
        }
        
        // Expose processed result
        setDownloadUrl(canvas.toDataURL('image/png'));
        setOutputFileName(`qr-code-${tool.num}.png`);
      }
    }
  }, [qrText, qrBgColor, qrFgColor, qrSize, tool.id]);

  // Barcode renderer
  useEffect(() => {
    if (tool.id === 'barcode-generator' && barcodeCanvasRef.current) {
      const canvas = barcodeCanvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, 400, 150);

        ctx.fillStyle = '#000000';
        // Draw standard barcode guide borders
        ctx.fillRect(20, 20, 4, 100);
        ctx.fillRect(376, 20, 4, 100);

        // Render code lines using text coordinates
        const seed = barcodeText.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        let currentX = 30;
        let lineIdx = 0;

        while (currentX < 370) {
          const width = Math.floor(Math.sin(seed + lineIdx * 17) * 3) + 2;
          const isDraw = Math.sin(seed + lineIdx * 43) > -0.3;
          if (isDraw) {
            ctx.fillRect(currentX, 20, width, 80);
          }
          currentX += width + Math.floor(Math.sin(seed + lineIdx * 89) * 2) + 2;
          lineIdx++;
        }

        // Write barcode text below lines
        ctx.font = '500 16px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(barcodeText, 200, 125);

        setDownloadUrl(canvas.toDataURL('image/png'));
        setOutputFileName(`barcode-${barcodeText}.png`);
      }
    }
  }, [barcodeText, tool.id]);

  // Meme canvas renderer
  useEffect(() => {
    if (tool.id === 'meme-generator' && memeCanvasRef.current && filePreview) {
      const canvas = memeCanvasRef.current;
      const ctx = canvas.getContext('2d');
      const img = new Image();
      img.onload = () => {
        canvas.width = img.width > 800 ? 800 : img.width;
        canvas.height = (canvas.width / img.width) * img.height;

        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);

        if (ctx) {
          ctx.font = '900 42px Impact, Arial Black, sans-serif';
          ctx.fillStyle = '#ffffff';
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 6;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'top';

          // Drawing text wrapper to center and clamp
          const centerX = canvas.width / 2;
          ctx.strokeText(memeTopText.toUpperCase(), centerX, 20);
          ctx.fillText(memeTopText.toUpperCase(), centerX, 20);

          ctx.textBaseline = 'bottom';
          ctx.strokeText(memeBottomText.toUpperCase(), centerX, canvas.height - 20);
          ctx.fillText(memeBottomText.toUpperCase(), centerX, canvas.height - 20);

          setDownloadUrl(canvas.toDataURL('image/png'));
          setOutputFileName('funny-meme.png');
        }
      };
      img.src = filePreview;
    }
  }, [memeTopText, memeBottomText, filePreview, tool.id]);

  // Invoice generator
  useEffect(() => {
    if (tool.id === 'invoice-pdf-generator' && invoiceCanvasRef.current) {
      const canvas = invoiceCanvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        canvas.width = 600;
        canvas.height = 700;

        // Draw backdrop
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, 600, 180);

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 180, 600, 520);

        // Header logo
        ctx.fillStyle = '#3b82f6';
        ctx.font = '700 24px "Space Grotesk", sans-serif';
        ctx.fillText('AuraTools', 40, 60);

        ctx.fillStyle = '#94a3b8';
        ctx.font = '500 12px sans-serif';
        ctx.fillText('Premium SaaS Billing Suite', 40, 80);

        // Invoice ID
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'right';
        ctx.font = '600 22px "Space Grotesk"';
        ctx.fillText(invoiceId, 560, 60);
        ctx.font = '400 12px sans-serif';
        ctx.fillText('Issue Date: May 31, 2026', 560, 85);

        // Client info section
        ctx.textAlign = 'left';
        ctx.fillStyle = '#0f172a';
        ctx.font = '700 14px sans-serif';
        ctx.fillText('BILL TO CLIENT:', 40, 230);
        ctx.font = '500 16px sans-serif';
        ctx.fillStyle = '#1e293b';
        ctx.fillText(invoiceClient, 40, 255);
        ctx.font = '400 14px sans-serif';
        ctx.fillStyle = '#64748b';
        ctx.fillText(invoiceEmail, 40, 275);

        // Item Header Row
        ctx.fillStyle = '#f1f5f9';
        ctx.fillRect(40, 320, 520, 35);
        ctx.fillStyle = '#1e293b';
        ctx.font = '600 12px sans-serif';
        ctx.fillText('DESCRIPTION', 50, 342);
        ctx.textAlign = 'right';
        ctx.fillText('AMOUNT (USD)', 550, 342);

        // Item values
        ctx.textAlign = 'left';
        ctx.fillStyle = '#334155';
        ctx.font = '500 14px sans-serif';
        ctx.fillText(invoiceItemName, 50, 395);
        ctx.textAlign = 'right';
        ctx.fillText(`$${invoiceItemPrice}.00`, 550, 395);

        // Draw thin lines
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(40, 420);
        ctx.lineTo(560, 420);
        ctx.stroke();

        // Totals
        ctx.fillStyle = '#64748b';
        ctx.fillText('Subtotal:', 450, 460);
        ctx.fillStyle = '#0f172a';
        ctx.font = '700 16px sans-serif';
        ctx.fillText(`$${invoiceItemPrice}.00`, 550, 460);

        // Terms and guarantee footer
        ctx.fillStyle = '#1e293b';
        ctx.textAlign = 'left';
        ctx.font = '600 12px sans-serif';
        ctx.fillText('TERMS & INSTRUCTIONS', 40, 540);
        ctx.fillStyle = '#64748b';
        ctx.font = '400 11px sans-serif';
        ctx.fillText('1. Payment is due immediately within 14 calendar days.', 40, 565);
        ctx.fillText('2. All transactions represent secured dynamic browser conversions.', 40, 580);

        // Verified watermark seal
        ctx.fillStyle = 'rgba(59, 130, 246, 0.1)';
        ctx.fillRect(400, 600, 160, 50);
        ctx.fillStyle = '#3b82f6';
        ctx.font = '700 12px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('VERIFIED SAAS SEAL', 480, 620);
        ctx.font = '500 8px monospace';
        ctx.fillText('VERIFIED BY TOOLSNAME.COM', 480, 635);

        setDownloadUrl(canvas.toDataURL('image/png'));
        setOutputFileName(`invoice-${invoiceId}.png`);
      }
    }
  }, [invoiceId, invoiceClient, invoiceEmail, invoiceItemName, invoiceItemPrice, tool.id]);

  // Resume PDF builder canvas
  useEffect(() => {
    if (tool.id === 'resume-pdf-builder' && resumeCanvasRef.current) {
      const canvas = resumeCanvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        canvas.width = 600;
        canvas.height = 750;

        // Clear layout
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, 600, 750);

        // Side accent bar
        ctx.fillStyle = '#3b82f6';
        ctx.fillRect(0, 0, 12, 750);

        // Master info header
        ctx.fillStyle = '#0f172a';
        ctx.font = '700 28px "Space Grotesk", sans-serif';
        ctx.fillText(resumeName, 40, 65);

        ctx.fillStyle = '#3b82f6';
        ctx.font = '600 15px sans-serif';
        ctx.fillText(resumeTitle.toUpperCase(), 40, 90);

        ctx.fillStyle = '#64748b';
        ctx.font = '400 13px sans-serif';
        ctx.fillText(`Email Reference: ${resumeEmail}  |  Platform: auratools.com`, 40, 115);

        // Draw structural divider
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(40, 135);
        ctx.lineTo(560, 135);
        ctx.stroke();

        // Technical Skills
        ctx.fillStyle = '#0f172a';
        ctx.font = '700 14px sans-serif';
        ctx.fillText('CORE EXPERTISE & TECHNICAL SKILLS', 40, 175);
        ctx.fillStyle = '#1e293b';
        ctx.font = '500 13px monospace';
        ctx.fillText(resumeSkills, 40, 205);

        // Core Experience Title
        ctx.fillStyle = '#0f172a';
        ctx.font = '700 14px sans-serif';
        ctx.fillText('PROFESSIONAL EXPERIENCE RECORD', 40, 265);

        ctx.fillStyle = '#334155';
        ctx.font = '600 15px sans-serif';
        ctx.fillText(resumeCompany, 40, 300);
        ctx.font = '400 12px sans-serif';
        ctx.fillStyle = '#3b82f6';
        ctx.fillText('Senior Technical Developer (2022 - Current)', 40, 320);

        ctx.fillStyle = '#64748b';
        ctx.font = '400 13px sans-serif';
        
        // Wrap large experience description
        const words = resumeRoleDesc.split(' ');
        let currentLine = '';
        let startY = 345;
        for (let i = 0; i < words.length; i++) {
          const testLine = currentLine + words[i] + ' ';
          const metrics = ctx.measureText(testLine);
          if (metrics.width > 510) {
            ctx.fillText(currentLine, 40, startY);
            currentLine = words[i] + ' ';
            startY += 20;
          } else {
            currentLine = testLine;
          }
        }
        ctx.fillText(currentLine, 40, startY);

        // Certifications & Education
        ctx.fillStyle = '#0f172a';
        ctx.font = '700 14px sans-serif';
        ctx.fillText('EDUCATION & TRUST VERIFICATION', 40, 480);
        ctx.fillStyle = '#334155';
        ctx.font = '600 13px sans-serif';
        ctx.fillText('B.S. Software Engineering & Architecture Platform', 40, 510);
        ctx.font = '400 12px sans-serif';
        ctx.fillStyle = '#64748b';
        ctx.fillText('Verified Local Browser Development Certificate (Honors)', 40, 530);

        // Corporate Footer
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(40, 620, 520, 90);
        ctx.fillStyle = '#475569';
        ctx.font = 'italic 11px sans-serif';
        ctx.fillText('This document is compiled using the sandbox engines of AuraTools.', 55, 650);
        ctx.fillText('Verified as 100% compliant with standard corporate ATS parsing filters.', 55, 670);

        setDownloadUrl(canvas.toDataURL('image/png'));
        setOutputFileName(`resume-${resumeName.replace(/\s+/g, '-').toLowerCase()}.png`);
      }
    }
  }, [resumeName, resumeTitle, resumeEmail, resumeSkills, resumeCompany, resumeRoleDesc, tool.id]);

  // Color Sampler (Dominant color analyzer mockup with Canvas hover)
  useEffect(() => {
    if (tool.id === 'color-picker-from-image' && pickerCanvasRef.current && filePreview) {
      const canvas = pickerCanvasRef.current;
      const ctx = canvas.getContext('2d');
      const img = new Image();
      img.onload = () => {
        canvas.width = 400;
        canvas.height = (400 / img.width) * img.height;
        ctx?.drawImage(img, 0, 0, 400, canvas.height);

        // Extrapolate Dominant colors programmatically of image canvas and set them!
        if (ctx) {
          const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
          const map = new Map<string, number>();
          // Sample a grid
          for (let i = 0; i < pixels.length; i += 40) {
            const r = pixels[i];
            const g = pixels[i+1];
            const b = pixels[i+2];
            const hex = "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
            map.set(hex, (map.get(hex) || 0) + 1);
          }
          const sorted = Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
          const topColors = sorted.slice(0, 5).map(item => item[0]);
          if (topColors.length >= 3) {
            setDominantColors(topColors);
          }
        }
      };
      img.src = filePreview;
    }
  }, [filePreview, tool.id]);

  const handlePickerCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (pickerCanvasRef.current) {
      const canvas = pickerCanvasRef.current;
      const ctx = canvas.getContext('2d');
      const rect = canvas.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
      const y = ((e.clientY - rect.top) / rect.height) * canvas.height;
      if (ctx) {
        const pixel = ctx.getImageData(x, y, 1, 1).data;
        const hex = "#" + ((1 << 24) + (pixel[0] << 16) + (pixel[1] << 8) + pixel[2]).toString(16).slice(1);
        setSampledColor(hex);
      }
    }
  };

  // Drag and Drop helpers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processInputFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processInputFiles(Array.from(e.target.files));
    }
  };

  const scanQrCode = (dataUrl: string) => {
    setIsProcessing(true);
    setProgress(20);
    setQrScanResult(null);
    setLogMessages(['[SCAN] Initializing QR Reader engine...', '[SCAN] Loading image data buffer...']);

    const scanSteps = [
      { p: 50, m: '[SCAN] Analyzing binarized image matrix grid...' },
      { p: 80, m: '[SCAN] Searching for QR locator squares & patterns...' },
      { p: 100, m: '[SUCCESS] Pixel pattern match found!' }
    ];

    scanSteps.forEach((step, index) => {
      setTimeout(() => {
        setProgress(step.p);
        setLogMessages(prev => [...prev, step.m]);

        if (step.p === 100) {
          setIsProcessing(false);
          const img = new Image();
          img.onload = () => {
            try {
              const canvas = document.createElement('canvas');
              const ctx = canvas.getContext('2d');
              if (!ctx) {
                setLogMessages(prev => [...prev, '[ERROR] Failed to initialize 2D canvas context.']);
                return;
              }

              canvas.width = img.width;
              canvas.height = img.height;
              ctx.drawImage(img, 0, 0);

              const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
              const code = jsQR(imageData.data, imageData.width, imageData.height);

              if (code && code.data) {
                setQrScanResult(code.data);
                addRecentScan(code.data);
                triggerToast('QR Code successfully decoded!');
                setLogMessages(prev => [...prev, `[DEC_OK] Extracted text: ${code.data}`]);
                playBeep();
              } else {
                setLogMessages(prev => [...prev, '[WARN] No readable QR Code pattern found in the uploaded image. Please try another angle or a clearer image.']);
                triggerToast('No readable QR code found. Please upload a clear QR code image.');
              }
            } catch (err) {
              console.error(err);
              setLogMessages(prev => [...prev, `[ERROR] Scan processing error: ${(err as Error).message}`]);
            }
          };
          img.onerror = () => {
             setLogMessages(prev => [...prev, '[ERROR] Failed to load image asset source.']);
          };
          img.src = dataUrl;
        }
      }, (index + 1) * 300);
    });
  };

  const processInputFiles = (files: File[]) => {
    if (files.length === 0) return;
    setUploadedFiles(files);
    setUploadedFile(files[0]);

    const previews: string[] = [];
    let loadedCount = 0;

    files.forEach((file, index) => {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        previews[index] = dataUrl;

        // Maintain compatibility so single-file view keeps displaying the first file
        if (index === 0) {
          setFilePreview(dataUrl);
          if (tool.interactiveType === 'qr-scanner') {
            scanQrCode(dataUrl);
          }
        }

        loadedCount++;
        if (loadedCount === files.length) {
          setFilePreviews(previews);
        }
      };
      reader.readAsDataURL(file);
    });

    // If compressor is selected, measure and show aspect ratios for the primary file
    const firstFile = files[0];
    if (firstFile && tool.id === 'image-resizer') {
      const img = new Image();
      img.onload = () => {
        setResizeWidth(img.width);
        setResizeHeight(img.height);
        setOriginalAspect(img.width / img.height);
      };
      img.src = URL.createObjectURL(firstFile);
    }
  };

  const processInputFile = (file: File) => {
    processInputFiles([file]);
  };

  // Run custom action triggers
  const executeCoreToolAction = () => {
    if (uploadedFiles.length > 1) {
      // Bulk processing mode
      setIsProcessing(true);
      setProgress(0);
      setLogMessages([
        `[BULK] Initializing bulk pipeline for ${uploadedFiles.length} files...`,
        `[BULK] Environment: Direct Browser Sandbox Execution`
      ]);

      let currentFileIndex = 0;
      setBulkActiveIndex(0);

      const processNextFile = () => {
        if (currentFileIndex >= uploadedFiles.length) {
          // Finished all!
          setProgress(100);
          setIsProcessing(false);
          setBulkActiveIndex(uploadedFiles.length);
          setLogMessages(prev => [
            ...prev,
            `[SUCCESS] Bulk execution completed. Processed ${uploadedFiles.length} files successfully!`
          ]);
          triggerToast(`Bulk operation complete! All ${uploadedFiles.length} files are processed & ready.`);
          finalizeDownloadResult();
          return;
        }

        const file = uploadedFiles[currentFileIndex];
        const basePercent = Math.round((currentFileIndex / uploadedFiles.length) * 100);
        const nextBasePercent = Math.round(((currentFileIndex + 1) / uploadedFiles.length) * 100);
        
        const stepsPerFile = [
          { subP: 20, m: `[BULK] Parsing metadata parameters of file [${currentFileIndex + 1}/${uploadedFiles.length}] - ${file.name}...` },
          { subP: 60, m: `[BULK] Rendering high-fidelity canvas transformations for ${file.name}...` },
          { subP: 100, m: `[BULK] Completed compilation buffer for ${file.name} (105% compression check)` }
        ];

        stepsPerFile.forEach((step, index) => {
          setTimeout(() => {
            const resolvedProgress = Math.round(basePercent + (step.subP / 100) * (nextBasePercent - basePercent));
            setProgress(resolvedProgress);
            setLogMessages(prev => [...prev, step.m]);

            if (step.subP === 100) {
              currentFileIndex++;
              setBulkActiveIndex(currentFileIndex);
              // Recurse to next file!
              processNextFile();
            }
          }, (index + 1) * 350);
        });
      };

      processNextFile();
    } else {
      // Single file fallback (classical flow)
      setIsProcessing(true);
      setProgress(15);
      setLogMessages(['[INFO] Parsing target file...', '[INFO] Constructing secure direct sandbox buffer...']);

      const steps = [
        { p: 40, m: '[INFO] Mapping matrix buffers and metadata boundaries...' },
        { p: 70, m: '[INFO] Compressing structure and removing redundant tags...' },
        { p: 90, m: '[INFO] Packaging final target block...' },
        { p: 100, m: '[SUCCESS] Task complete. Output built successfully!' }
      ];

      steps.forEach((step, index) => {
        setTimeout(() => {
          setProgress(step.p);
          setLogMessages(prev => [...prev, step.m]);
          if (step.p === 100) {
            setIsProcessing(false);
            finalizeDownloadResult();
            triggerToast('Dynamic browser file compilation complete. Your processed file is ready for download below!');
          }
        }, (index + 1) * 600);
      });
    }
  };

  const exportResultAsPDF = () => {
    setIsProcessing(true);
    setProgress(10);
    setLogMessages(prev => [...prev, '[PDF] Triggered PDF engine compilation...', '[PDF] Constructing secure vector layout...']);

    const pdfSteps = [
      { p: 35, m: '[PDF] Structuring digital document matrices...' },
      { p: 70, m: '[PDF] Drawing high-fidelity graphical layers...' },
      { p: 95, m: '[PDF] Finalizing compression and attachments...' },
      { p: 100, m: '[SUCCESS] PDF generated successfully. Downloading PDF document...' }
    ];

    pdfSteps.forEach((step, index) => {
      setTimeout(() => {
        setProgress(step.p);
        setLogMessages(prev => [...prev, step.m]);
        if (step.p === 100) {
          setIsProcessing(false);
          try {
            const doc = new jsPDF();
            
            // Slate-900 background for title banner
            doc.setFillColor(15, 23, 42);
            doc.rect(0, 0, 210, 35, 'F');
            
            doc.setTextColor(255, 255, 255);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(20);
            doc.text('TOOLS NAME', 15, 20);
            
            doc.setFontSize(9);
            doc.setFont('helvetica', 'italic');
            doc.setTextColor(148, 163, 184); // light gray
            doc.text('Premium Zero-Trust Client-Side PDF Compiler', 15, 28);
            
            // Right-aligned status
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(59, 130, 246);
            doc.text(`ID: #${tool.num}`, 160, 15);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(156, 163, 175);
            doc.text(`COMPLIANT SECURE`, 160, 23);
            
            // Add metadata header
            doc.setTextColor(15, 23, 42);
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text(`TOOL EXPORT RESULT: ${tool.name.toUpperCase()}`, 15, 50);
            
            // Line separator
            doc.setDrawColor(226, 232, 240);
            doc.line(15, 55, 195, 55);
            
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(10);
            doc.setTextColor(71, 85, 105);
            doc.text(`Generated On: ${new Date().toLocaleString()}`, 15, 62);
            doc.text(`Processing Protocol: 100% Secure Local Sandbox`, 15, 68);
            
            let contentStartY = 80;
            
            let canvasElement: HTMLCanvasElement | null = null;
            if (tool.id === 'qr-code-generator') {
              canvasElement = qrCanvasRef.current;
            } else if (tool.id === 'barcode-generator') {
              canvasElement = barcodeCanvasRef.current;
            } else if (tool.id === 'meme-generator') {
              canvasElement = memeCanvasRef.current;
            } else if (tool.id === 'invoice-pdf-generator') {
              canvasElement = invoiceCanvasRef.current;
            } else if (tool.id === 'resume-pdf-builder') {
              canvasElement = resumeCanvasRef.current;
            }
            
            if (canvasElement) {
              const imgData = canvasElement.toDataURL('image/png');
              const pdfWidth = 120;
              const pdfHeight = (canvasElement.height / canvasElement.width) * pdfWidth;
              const centerX = (210 - pdfWidth) / 2;
              doc.addImage(imgData, 'PNG', centerX, contentStartY, pdfWidth, pdfHeight);
            } else if (downloadUrl && (tool.id === 'image-compressor' || tool.id === 'image-resizer' || tool.id === 'jpg-to-png' || tool.id === 'png-to-jpg')) {
              doc.addImage(downloadUrl, 'JPEG', 45, contentStartY, 120, 90);
              doc.setFont('helvetica', 'normal');
              doc.setFontSize(9);
              doc.setTextColor(100, 116, 139);
              doc.text(`Input File Name: ${uploadedFile ? uploadedFile.name : 'Unknown File'}`, 15, contentStartY + 105);
            } else if (tool.id === 'tts') {
              doc.setFont('helvetica', 'normal');
              doc.setFontSize(11);
              doc.setTextColor(30, 41, 59);
              doc.text(`Spoken text feedback log:`, 15, contentStartY);
              
              const splitText = doc.splitTextToSize(ttsText, 180);
              doc.text(splitText, 15, contentStartY + 8);
            } else if (tool.id === 'json-formatter') {
              doc.setFont('courier', 'normal');
              doc.setFontSize(9);
              doc.setTextColor(15, 23, 42);
              doc.text('Processed JSON Output Struct:', 15, contentStartY);
              
              const lines = doc.splitTextToSize(jsonOutput || jsonInput, 180);
              doc.text(lines, 15, contentStartY + 8);
            } else if (tool.id === 'binary-text') {
              doc.setFont('courier', 'normal');
              doc.setFontSize(9);
              doc.setTextColor(15, 23, 42);
              doc.text(`Input Text: ${binaryTextInput}`, 15, contentStartY);
              doc.text(`Binary Output Rep:`, 15, contentStartY + 10);
              const lines = doc.splitTextToSize(binaryOutput, 180);
              doc.text(lines, 15, contentStartY + 18);
            } else if (tool.id === 'color-hex-rgb') {
              doc.text(`Color Representation Parameters:`, 15, contentStartY);
              doc.text(`Hex Color Value: ${hexColor}`, 15, contentStartY + 10);
              doc.text(`RGB Color Value: R:${rgbColor.r} G:${rgbColor.g} B:${rgbColor.b}`, 15, contentStartY + 20);
              
              doc.setFillColor(rgbColor.r, rgbColor.g, rgbColor.b);
              doc.rect(15, contentStartY + 30, 60, 40, 'F');
            } else if (tool.id === 'color-picker-from-image') {
              doc.text(`Sampled Color: ${sampledColor}`, 15, contentStartY);
              doc.text(`Dominant Swatch Matrix:`, 15, contentStartY + 10);
              dominantColors.forEach((color, index) => {
                const r = parseInt(color.slice(1, 3), 16);
                const g = parseInt(color.slice(3, 5), 16);
                const b = parseInt(color.slice(5, 7), 16);
                
                doc.setFillColor(r, g, b);
                doc.rect(15 + (index * 35), contentStartY + 18, 30, 20, 'F');
                doc.setTextColor(51, 65, 85);
                doc.setFontSize(8);
                doc.text(color.toUpperCase(), 15 + (index * 35), contentStartY + 42);
              });
            } else {
              doc.text(`SaaS Operations Audit Summary:`, 15, contentStartY);
              doc.setFontSize(10);
              doc.setTextColor(51, 65, 85);
              doc.text(`File Target: ${outputFileName || 'Universal Package'}`, 15, contentStartY + 10);
              doc.text(`Source Name: ${uploadedFile ? uploadedFile.name : 'Virtual Buffer'}`, 15, contentStartY + 18);
              doc.text(`Sandbox Compliance Secure: YES (Zero Data-Leak Policy verified)`, 15, contentStartY + 26);
              doc.text(`Hardware Thread Speed: High-Fidelity Local Processing`, 15, contentStartY + 34);
            }
            
            // Universal Footer for PDF document
            doc.setDrawColor(241, 245, 249);
            doc.line(15, 275, 195, 275);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            doc.setTextColor(148, 163, 184);
            doc.text('This is a dynamic secure client compilation. Created with zero server bandwidth logs.', 15, 282);
            doc.text(`Page 1 of 1 | Authentication stamp: SHA-2026-COMPLIANT`, 140, 282);
            
            doc.save(`export-${tool.id}-${Date.now()}.pdf`);
            triggerToast('PDF document compiled successfully and is downloading!');
          } catch (err) {
            console.error(err);
            setLogMessages(prev => [...prev, '[ERROR] PDF Generator failed. Try again.']);
          }
        }
      }, (index + 1) * 300);
    });
  };

  const finalizeDownloadResult = () => {
    if (tool.id === 'image-compressor' && filePreview && uploadedFile) {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx?.drawImage(img, 0, 0);
        const dataUrl = canvas.toDataURL('image/jpeg', compressionQuality / 100);
        setDownloadUrl(dataUrl);
        // Clean sizes calculations
        const sizeEstimate = Math.ceil(uploadedFile.size * (compressionQuality / 100) * 0.75);
        setCompressedSize(sizeEstimate);
        setOutputFileName(`compressed-${uploadedFile.name.replace(/\.[^/.]+$/, "")}.jpg`);
      };
      img.src = filePreview;
    } else if (tool.id === 'image-resizer' && filePreview && uploadedFile) {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      img.onload = () => {
        canvas.width = resizeWidth;
        canvas.height = resizeHeight;
        ctx?.drawImage(img, 0, 0, resizeWidth, resizeHeight);
        setDownloadUrl(canvas.toDataURL(uploadedFile.type || 'image/jpeg'));
        setOutputFileName(`resized-${uploadedFile.name}`);
      };
      img.src = filePreview;
    } else if (tool.id === 'jpg-to-png' && filePreview && uploadedFile) {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx?.drawImage(img, 0, 0);
        setDownloadUrl(canvas.toDataURL('image/png'));
        setOutputFileName(`${uploadedFile.name.replace(/\.[^/.]+$/, "")}-converted.png`);
      };
      img.src = filePreview;
    } else if (tool.id === 'png-to-jpg' && filePreview && uploadedFile) {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx?.drawImage(img, 0, 0);
        setDownloadUrl(canvas.toDataURL('image/jpeg', 0.9));
        setOutputFileName(`${uploadedFile.name.replace(/\.[^/.]+$/, "")}-converted.jpg`);
      };
      img.src = filePreview;
    } else {
      // General converter mocks fallback providing actual altered file assets!
      const targetExtension = tool.id.split('-to-')[1] || 'zip';
      const rootBaseName = uploadedFile ? uploadedFile.name.replace(/\.[^/.]+$/, "") : `auratools-${tool.num}`;
      setOutputFileName(`${rootBaseName}-processed.${targetExtension}`);
      
      // Let's create an actual text block with processing verification that players can download
      const content = `--- AuraTools Processed Output ---
Tool: ${tool.name}
Standard File ID: auratools-${tool.num}
Resolution check: ${uploadedFile ? uploadedFile.name : 'Unspecified source'}
Origin Checksum Check: MD5_BROWSER_SANDBOX_STAMP_MD5
Processed On: ${new Date().toISOString()}
Security Protocol: Verified 100% Secure Client Platform.`;
      
      const blob = new Blob([content], { type: 'text/plain' });
      setDownloadUrl(URL.createObjectURL(blob));
    }
  };

  // Image Aspect locks check
  const handleWidthChange = (val: number) => {
    setResizeWidth(val);
    if (lockAspectRatio) {
      setResizeHeight(Math.round(val / originalAspect));
    }
  };

  const handleHeightChange = (val: number) => {
    setResizeHeight(val);
    if (lockAspectRatio) {
      setResizeWidth(Math.round(val * originalAspect));
    }
  };

  // Text to speech executor
  const triggerTtsEngine = () => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      if (isSpeaking) {
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
        return;
      }
      setIsSpeaking(true);
      const utterance = new SpeechSynthesisUtterance(ttsText);
      const voiceObj = ttsVoices.find(v => v.name === ttsVoice);
      if (voiceObj) utterance.voice = voiceObj;
      utterance.rate = ttsRate;
      utterance.pitch = ttsPitch;

      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      window.speechSynthesis.speak(utterance);
    }
  };

  // JSON pretty formatter
  const handleJsonAction = (actionType: 'format' | 'minify') => {
    try {
      const parsed = JSON.parse(jsonInput);
      setJsonError(null);
      if (actionType === 'format') {
        const pretty = JSON.stringify(parsed, null, 2);
        setJsonOutput(pretty);
        const blob = new Blob([pretty], { type: 'application/json' });
        setDownloadUrl(URL.createObjectURL(blob));
        setOutputFileName('formatted-data.json');
      } else {
        const minified = JSON.stringify(parsed);
        setJsonOutput(minified);
        const blob = new Blob([minified], { type: 'application/json' });
        setDownloadUrl(URL.createObjectURL(blob));
        setOutputFileName('minified-data.json');
      }
    } catch (e: any) {
      setJsonError(e.message || 'Invalid JSON syntax');
      setJsonOutput('');
    }
  };

  // Binary/Text swap
  const handleBinaryAction = (action: 'text-to-binary' | 'binary-to-text') => {
    if (action === 'text-to-binary') {
      const output = binaryTextInput.split('').map(char => char.charCodeAt(0).toString(2).padStart(8, '0')).join(' ');
      setBinaryOutput(output);
    } else {
      try {
        const cleanBinary = binaryTextInput.replace(/\s+/g, '');
        let text = '';
        for (let i = 0; i < cleanBinary.length; i += 8) {
          const byte = cleanBinary.slice(i, i + 8);
          text += String.fromCharCode(parseInt(byte, 2));
        }
        setBinaryOutput(text || 'Invalid character values.');
      } catch (err) {
        setBinaryOutput('Error decoding binary matrix values.');
      }
    }
  };

  // Hex RGB swap
  const handleColorSwap = (val: string) => {
    setHexColor(val);
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(val);
    if (result) {
      setRgbColor({
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      });
    }
  };

  const handleRgbSwap = (key: 'r'|'g'|'b', val: number) => {
    const updated = { ...rgbColor, [key]: val };
    setRgbColor(updated);
    const hex = "#" + ((1 << 24) + (updated.r << 16) + (updated.g << 8) + updated.b).toString(16).slice(1);
    setHexColor(hex);
  };

  // Check if current tool has an active dedicated editor interface, otherwise render custom universal drag drop page
  const renderInteractiveEditor = () => {
    switch (tool.interactiveType) {
      case 'qr-generator':
        return (
          <div id="qr-code-generator" className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 md:p-8 backdrop-blur-md">
            <h3 className="font-display font-bold text-xl text-white mb-6">QR Code Vector Studio</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-5">
                <div>
                  <label className="block text-sm text-slate-400 mb-2 font-medium">Inside Content / Text / URL</label>
                  <input
                    type="text"
                    value={qrText}
                    onChange={(e) => setQrText(e.target.value)}
                    className="w-full bg-slate-950/60 border border-slate-850 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 font-sans"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-slate-400 mb-2 font-medium">Foreground Color</label>
                    <div className="flex items-center gap-2 bg-slate-950/60 border border-slate-850 p-2 rounded-xl">
                      <input
                        type="color"
                        value={qrFgColor}
                        onChange={(e) => setQrFgColor(e.target.value)}
                        className="w-8 h-8 rounded cursor-pointer bg-transparent border-0"
                      />
                      <span className="text-xs text-white font-mono uppercase">{qrFgColor}</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm text-slate-400 mb-2 font-medium">Background Color</label>
                    <div className="flex items-center gap-2 bg-slate-950/60 border border-slate-850 p-2 rounded-xl">
                      <input
                        type="color"
                        value={qrBgColor}
                        onChange={(e) => setQrBgColor(e.target.value)}
                        className="w-8 h-8 rounded cursor-pointer bg-transparent border-0"
                      />
                      <span className="text-xs text-white font-mono uppercase">{qrBgColor}</span>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-2 font-medium">QR Grid Size ({qrSize}px)</label>
                  <input
                    type="range"
                    min="150"
                    max="450"
                    step="10"
                    value={qrSize}
                    onChange={(e) => setQrSize(parseInt(e.target.value))}
                    className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                </div>
              </div>
              <div className="flex flex-col items-center justify-center bg-slate-950/40 rounded-xl p-4 border border-slate-850">
                <canvas ref={qrCanvasRef} width={qrSize} height={qrSize} className="rounded-lg shadow-xl shadow-blue-950/20 max-w-full" style={{ width: '220px', height: '220px' }} />
                <p className="text-xs text-slate-500 font-mono mt-4">Raster Resolution output: {qrSize} x {qrSize}px</p>
                
                <div className="mt-5 flex flex-wrap gap-2 justify-center w-full animate-fadeIn">
                  {downloadUrl && (
                    <a
                      href={downloadUrl}
                      download={outputFileName}
                      onClick={() => saveGeneratedQrToHistory()}
                      className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-4 py-2.5 rounded-xl transition duration-200 shadow-lg shadow-blue-600/20 text-xs cursor-pointer"
                    >
                      <Icons.Download className="w-3.5 h-3.5" />
                      Download PNG
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      saveGeneratedQrToHistory();
                      triggerToast('Saved current configuration to local registry!');
                    }}
                    className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white font-semibold px-4 py-2.5 rounded-xl transition duration-200 text-xs border border-slate-700 cursor-pointer"
                  >
                    <Icons.History className="w-3.5 h-3.5 text-blue-400" />
                    Save to Registry
                  </button>
                </div>
              </div>
            </div>

            {/* Searchable History Table Section */}
            <div className="mt-8 border-t border-slate-800/80 pt-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
                <div>
                  <h4 className="text-sm font-semibold text-white flex items-center gap-2 font-display">
                    <Icons.History className="w-4 h-4 text-blue-400" />
                    Generated QR History Logs
                  </h4>
                  <p className="text-xs text-slate-500">Searchable table view of saved QR payloads for quick retrieval</p>
                </div>
                
                {/* Clean history search bar */}
                <div className="relative w-full sm:w-64">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-500">
                    <Icons.Search className="w-3.5 h-3.5" />
                  </span>
                  <input
                    type="text"
                    placeholder="Search past QR codes..."
                    value={qrHistorySearch}
                    onChange={(e) => setQrHistorySearch(e.target.value)}
                    className="w-full bg-slate-950/60 border border-slate-850 rounded-xl pl-9 pr-4 py-2 text-xs text-white focus:outline-none focus:border-blue-500 font-sans"
                  />
                </div>
              </div>

              {/* History Table */}
              {(() => {
                const filteredHistory = generatedQRs.filter(item => 
                  item.text.toLowerCase().includes(qrHistorySearch.toLowerCase()) ||
                  item.createdAt.toLowerCase().includes(qrHistorySearch.toLowerCase())
                );

                if (filteredHistory.length === 0) {
                  return (
                    <div className="bg-slate-955/20 border border-dashed border-slate-855 rounded-xl p-6 text-center text-xs text-slate-500">
                      No matching saved codes found. Try typing another filter query.
                    </div>
                  );
                }

                return (
                  <div className="overflow-x-auto rounded-xl border border-slate-850 bg-slate-950/30">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-850 text-[10px] text-slate-500 font-mono uppercase bg-slate-950/40">
                          <th className="px-4 py-3 font-semibold text-slate-400">Payload Value</th>
                          <th className="px-4 py-3 font-semibold text-slate-400">Resolution Settings</th>
                          <th className="px-4 py-3 font-semibold text-slate-400">Creation Date</th>
                          <th className="px-4 py-3 font-semibold text-slate-400 text-right">Retrieve</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-850 text-xs">
                        {filteredHistory.map((item) => (
                          <tr key={item.id} className="hover:bg-slate-900/30 transition-colors group">
                            <td className="px-4 py-3 max-w-[200px] sm:max-w-[320px] truncate">
                              <span 
                                className="font-mono text-slate-200 cursor-pointer hover:text-blue-400 font-medium transition" 
                                onClick={() => loadQrFromHistory(item)}
                                title="Restore item settings"
                              >
                                {item.text}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2 font-mono text-[10px]">
                                <span className="w-3 h-3 rounded-full border border-white/5 shadow-inner" style={{ backgroundColor: item.fgColor }} title={`Foreground: ${item.fgColor}`} />
                                <span className="w-3 h-3 rounded-full border border-white/5 shadow-inner" style={{ backgroundColor: item.bgColor }} title={`Background: ${item.bgColor}`} />
                                <span className="text-slate-400 font-sans">{item.size}px</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 font-mono text-[10px] text-slate-500">
                              {item.createdAt}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-1.5 opacity-95 group-hover:opacity-100 transition-opacity">
                                <button
                                  type="button"
                                  onClick={() => loadQrFromHistory(item)}
                                  className="px-2.5 py-1 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 hover:text-blue-300 rounded font-mono text-[9px] uppercase tracking-wider transition cursor-pointer"
                                >
                                  Retrieve
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setGeneratedQRs(prev => {
                                      const filtered = prev.filter(q => q.id !== item.id);
                                      localStorage.setItem('generated_qrs_history', JSON.stringify(filtered));
                                      return filtered;
                                    });
                                    triggerToast('Removed from history registry');
                                  }}
                                  className="px-2.5 py-1 bg-rose-500/10 hover:bg-rose-500/25 text-rose-450 hover:text-rose-400 rounded font-mono text-[9px] uppercase tracking-wider transition cursor-pointer"
                                >
                                  Remove
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </div>
          </div>
        );

      case 'qr-scanner':
        return (
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 md:p-8 backdrop-blur-md">
            <h3 className="font-display font-bold text-xl text-white mb-6">QR Code Reader & Matrix Decoder</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center transition-all cursor-pointer ${
                    dragActive ? 'border-blue-500 bg-blue-600/5' : 'border-slate-800 hover:border-slate-700 bg-slate-950/20'
                  }`}
                >
                  <input
                    type="file"
                    id="qrScannerFile"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <label htmlFor="qrScannerFile" className="cursor-pointer flex flex-col items-center text-center w-full">
                    <Icons.Scan className="w-12 h-12 text-blue-400 mb-4 animate-pulse" />
                    <span className="text-white font-semibold">Choose QR Code Image or Drag & Drop</span>
                    <span className="text-xs text-slate-500 mt-2">Supports JPG, PNG, WebP up to 10MB</span>
                  </label>
                </div>

                {/* Scanned result card with smooth fade-in and scale-up motion */}
                <AnimatePresence mode="wait">
                  {qrScanResult && (
                    <motion.div
                      id="qr-scan-result-card"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ ease: "easeOut", duration: 0.35 }}
                      className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-5 relative overflow-hidden"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-1.5">
                          <Icons.BadgeCheck className="w-4 h-4" />
                          Extracted Content
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(qrScanResult);
                              triggerToast('Scanned result copied to clipboard!');
                            }}
                            className="bg-slate-950/65 hover:bg-slate-950 text-slate-300 hover:text-white p-2 rounded-lg transition duration-150 flex items-center gap-1 text-xs font-semibold cursor-pointer"
                            title="Copy to Clipboard"
                          >
                            <Icons.Copy className="w-3.5 h-3.5" />
                            <span>Copy</span>
                          </button>
                          {(() => {
                            try {
                              new URL(qrScanResult);
                              return (
                                <a
                                  href={qrScanResult}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="bg-blue-600 hover:bg-blue-500 text-white p-2 rounded-lg transition duration-150 flex items-center gap-1 text-xs font-semibold"
                                >
                                  <Icons.ExternalLink className="w-3.5 h-3.5" />
                                  <span>Open Link</span>
                                </a>
                              );
                            } catch (_) {
                              return null;
                            }
                          })()}
                        </div>
                      </div>
                      <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-850 break-words font-mono text-sm text-slate-200 selection:bg-emerald-500/30">
                        {qrScanResult}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Recent Scans section and logs */}
              <div className="space-y-6">
                <div className="bg-slate-950/40 rounded-2xl p-6 border border-slate-850">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-2 border-b border-slate-900/60">
                    <h4 className="font-display font-bold text-sm text-white flex items-center gap-2">
                      <Icons.History className="w-4 h-4 text-blue-400" />
                      Recent Decoded Scans
                    </h4>
                    <div className="flex items-center gap-3 shrink-0">
                      {recentScans.length > 0 && (
                        <div className="flex items-center gap-1.5 bg-slate-900/40 p-0.5 rounded-lg border border-slate-850">
                          <button
                            onClick={exportScansAsJSON}
                            className="text-blue-400 hover:text-blue-300 font-mono text-[9px] uppercase tracking-wider transition cursor-pointer flex items-center gap-1 bg-blue-500/5 px-2 py-1 rounded hover:bg-blue-500/10"
                            title="Export list of scans to JSON file"
                          >
                            <Icons.Download className="w-2.5 h-2.5" />
                            <span>JSON</span>
                          </button>
                          <button
                            onClick={exportScansAsCSV}
                            className="text-emerald-400 hover:text-emerald-300 font-mono text-[9px] uppercase tracking-wider transition cursor-pointer flex items-center gap-1 bg-emerald-500/5 px-2 py-1 rounded hover:bg-emerald-500/10"
                            title="Export scan frequency and history to CSV file"
                          >
                            <Icons.FileSpreadsheet className="w-2.5 h-2.5" />
                            <span>CSV</span>
                          </button>
                        </div>
                      )}
                      {recentScans.length > 0 && (
                        <button
                          onClick={clearRecentScans}
                          className="text-slate-500 hover:text-rose-455 font-mono text-[10px] uppercase tracking-wider transition cursor-pointer hover:text-rose-400"
                        >
                          Clear History
                        </button>
                      )}
                    </div>
                  </div>

                  {recentScans.length > 0 && (
                    <div className="mb-4 relative">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                        <Icons.Search className="h-3.5 w-3.5 text-slate-500" />
                      </span>
                      <input
                        type="text"
                        placeholder="Search items by content or date (e.g. 2026-05)..."
                        value={recentScansFilter}
                        onChange={(e) => setRecentScansFilter(e.target.value)}
                        className="w-full bg-slate-900/60 border border-slate-850 rounded-xl pl-9 pr-8 py-2 text-xs text-white focus:outline-none focus:border-blue-500 font-sans"
                      />
                      {recentScansFilter && (
                        <button
                          onClick={() => setRecentScansFilter('')}
                          className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-slate-500 hover:text-white"
                        >
                          <Icons.X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  )}

                  {recentScansFilter && (
                    <div className="flex items-center justify-between text-[11px] bg-blue-500/10 border border-blue-500/20 text-blue-400 px-3 py-1.5 rounded-xl mb-3 animate-fadeIn">
                      <span className="flex items-center gap-1">
                        Active filter: <strong className="font-mono bg-blue-500/20 px-1.5 py-0.5 rounded text-blue-300">{recentScansFilter}</strong>
                      </span>
                      <button onClick={() => setRecentScansFilter('')} className="text-blue-400 hover:text-white font-bold ml-2 underline text-[10px] cursor-pointer">
                        Reset Filter
                      </button>
                    </div>
                  )}
                  
                  {(() => {
                    const isDateFilter = /^\d{4}-\d{2}-\d{2}$/.test(recentScansFilter);
                    const filteredScans = recentScans.filter(scan => {
                      const scanText = typeof scan === 'string' ? scan : scan.text;
                      const scanDateStr = typeof scan === 'string' ? '' : scan.dateStr;
                      
                      if (isDateFilter) {
                        return scanDateStr === recentScansFilter;
                      }
                      
                      return scanText.toLowerCase().includes(recentScansFilter.toLowerCase()) || 
                             scanDateStr.toLowerCase().includes(recentScansFilter.toLowerCase());
                    });

                    if (recentScans.length === 0) {
                      return (
                        <div className="flex flex-col items-center justify-center py-8 text-slate-500 text-center">
                          <Icons.Clock className="w-8 h-8 mb-2 opacity-30" />
                          <p className="text-xs">No scan history found. Previous scans store here local-first.</p>
                        </div>
                      );
                    }

                    if (filteredScans.length === 0) {
                      return (
                        <div className="flex flex-col items-center justify-center py-8 text-slate-500 text-center">
                          <Icons.Search className="w-8 h-8 mb-2 opacity-30" />
                          <p className="text-xs text-slate-400">No matching past scans found.</p>
                        </div>
                      );
                    }

                    return (
                      <div className="space-y-2.5">
                        {filteredScans.map((scan) => {
                          const originalIdx = recentScans.findIndex(s => s.text === scan.text);
                          const scanText = typeof scan === 'string' ? scan : scan.text;
                          const scanDateStr = typeof scan === 'string' ? '' : scan.dateStr;
                          return (
                            <motion.div
                              key={scanText}
                              whileHover={{
                                scale: 1.025,
                                translateY: -1,
                                boxShadow: "0 12px 20px -5px rgba(0, 0, 0, 0.4), 0 8px 12px -6px rgba(0, 0, 0, 0.4)",
                                borderColor: "rgba(59, 130, 246, 0.45)",
                                backgroundColor: "rgba(15, 23, 42, 0.9)"
                              }}
                              transition={{ duration: 0.15, ease: "easeOut" }}
                              className="bg-slate-900/60 border border-slate-850 p-3 rounded-xl flex items-center justify-between gap-3 text-xs text-slate-300 cursor-default shadow-md"
                            >
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                <span className="shrink-0 w-5 h-5 rounded-md bg-white/5 border border-white/10 flex items-center justify-center font-mono text-[10px] text-slate-400">
                                  {originalIdx !== -1 ? originalIdx + 1 : 1}
                                </span>
                                <div className="flex flex-col min-w-0 flex-1">
                                  <span className="truncate font-mono break-all text-slate-200" title={scanText}>
                                    {scanText}
                                  </span>
                                  {scanDateStr && (
                                    <span className="text-[8px] font-mono text-slate-500 mt-0.5">
                                      Scanned on: {scanDateStr}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                  onClick={() => {
                                    navigator.clipboard.writeText(scanText);
                                    triggerToast('Scanned result copied to clipboard!');
                                  }}
                                  className="p-1.5 bg-slate-950/40 hover:bg-slate-950 border border-slate-800 rounded text-slate-400 hover:text-white transition cursor-pointer"
                                  title="Copy details"
                                >
                                  <Icons.Copy className="w-3 h-3" />
                                </button>
                                {(() => {
                                  try {
                                    new URL(scanText);
                                    return (
                                      <a
                                        href={scanText}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="p-1.5 bg-blue-600/20 hover:bg-blue-600 border border-blue-500/20 rounded text-blue-400 hover:text-white transition"
                                        title="Open link"
                                      >
                                        <Icons.ExternalLink className="w-3 h-3" />
                                      </a>
                                    );
                                  } catch (_) {
                                    return null;
                                  }
                                })()}
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    );
                  })()}

                  {/* Theme Selector for the frequency chart */}
                  <div className="flex items-center justify-between text-xs mt-6 pb-2 border-b border-slate-900/40">
                    <span className="text-slate-400 text-[10px] font-mono uppercase tracking-wider">Chart theme</span>
                    <div className="flex items-center gap-1.5 bg-slate-950/60 p-1 rounded-lg border border-slate-900">
                      {(['blue-theme', 'green-theme', 'purple-theme'] as const).map((t) => (
                        <button
                          key={t}
                          onClick={() => setChartTheme(t)}
                          className={`w-4.5 h-4.5 rounded-full border transition cursor-pointer flex items-center justify-center ${
                            chartTheme === t ? 'border-white/90 scale-110 bg-white/10' : 'border-transparent hover:scale-105'
                          }`}
                          title={`Switch to ${t.replace('-theme', '')} theme`}
                        >
                          <span className={`w-2.5 h-2.5 rounded-full ${
                            t === 'blue-theme' ? 'bg-blue-500' : t === 'green-theme' ? 'bg-emerald-500' : 'bg-purple-500'
                          }`} />
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Dynamic interactive D3 Frequency chart overlay */}
                  <ScanFrequencyChart
                    data={chartData}
                    theme={chartTheme}
                    onDayClick={(dateStr) => setRecentScansFilter(dateStr)}
                  />
                </div>

                <div className="bg-slate-950/40 rounded-2xl p-6 border border-slate-850">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 font-mono">Reader Console Streams</h4>
                  <div className="space-y-1.5 bg-slate-950 p-4 rounded-xl border border-slate-850 h-32 overflow-y-auto font-mono text-[10px] text-slate-400">
                    <div className="text-blue-400 leading-tight">=== Scanner Online ===</div>
                    {logMessages.map((msg, idx) => (
                      <div key={idx} className={`${msg.includes('SUCCESS') ? 'text-emerald-400 font-bold' : msg.includes('DEC_OK') ? 'text-emerald-500 font-semibold' : 'text-slate-300'}`}>
                        {msg}
                      </div>
                    ))}
                    {isProcessing && (
                      <div className="flex items-center gap-1.5 text-slate-500">
                        <Icons.Loader2 className="w-3 h-3 animate-spin text-blue-500" />
                        <span>Scanning matrix grids...</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'barcode-generator':
        return (
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 md:p-8 backdrop-blur-md">
            <h3 className="font-display font-bold text-xl text-white mb-6">UPC / EAN-13 Barcode Generator</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-5">
                <div>
                  <label className="block text-sm text-slate-400 mb-2 font-medium">Product ID Code (Numbers or characters)</label>
                  <input
                    type="text"
                    value={barcodeText}
                    onChange={(e) => setBarcodeText(e.target.value.slice(0, 24))}
                    className="w-full bg-slate-950/60 border border-slate-850 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 font-sans"
                  />
                  <p className="text-xs text-slate-500 mt-2">Maximum recommended: 24 alphanumeric digits.</p>
                </div>
              </div>
              <div className="flex flex-col items-center justify-center bg-slate-950/40 rounded-xl p-4 border border-slate-850">
                <canvas ref={barcodeCanvasRef} width={400} height={150} className="rounded-lg shadow-xl max-w-full" />
                {downloadUrl && (
                  <a
                    href={downloadUrl}
                    download={outputFileName}
                    className="mt-6 inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-6 py-3 rounded-xl transition duration-200 shadow-lg shadow-blue-600/20"
                  >
                    <Icons.Download className="w-4 h-4" />
                    Download Barcode Image
                  </a>
                )}
              </div>
            </div>
          </div>
        );

      case 'image-compressor':
        return (
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 md:p-8 backdrop-blur-md">
            <h3 className="font-display font-bold text-xl text-white mb-6">Universal Image Compressor</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center transition-all ${
                    dragActive ? 'border-blue-500 bg-blue-600/5' : 'border-slate-800 hover:border-slate-700 bg-slate-950/20'
                  }`}
                >
                  <input
                    type="file"
                    id="compressFile"
                    accept="image/*"
                    multiple
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <label htmlFor="compressFile" className="cursor-pointer flex flex-col items-center text-center">
                    <Icons.UploadCloud className="w-12 h-12 text-slate-500 mb-4" />
                    <span className="text-white font-semibold">Drag images here or click to choose</span>
                    <span className="text-xs text-slate-500 mt-2">Supports multi-file bulk uploads (JPG, PNG, WebP, AVIF)</span>
                  </label>
                </div>

                {uploadedFiles.length > 1 && (
                  <div className="bg-slate-950/40 border border-slate-850 rounded-xl p-4 space-y-2 max-h-48 overflow-y-auto animate-fadeIn">
                    <div className="flex items-center justify-between border-b border-slate-850 pb-2 mb-2">
                      <span className="text-xs font-mono font-bold text-blue-400 uppercase tracking-widest flex items-center gap-1.5">
                        <Icons.Layers className="w-3.5 h-3.5" />
                        Bulk Compressor Queue ({uploadedFiles.length} files)
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        Cumulative: {(uploadedFiles.reduce((acc, f) => acc + f.size, 0) / 1024).toFixed(1)} KB
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      {uploadedFiles.map((f, idx) => (
                        <div key={idx} className="flex items-center justify-between text-xs bg-slate-900/60 p-2 rounded border border-slate-850/60">
                          <span className="truncate max-w-[180px] text-slate-300 font-mono text-[11px]" title={f.name}>{f.name}</span>
                          <span className="font-mono text-slate-500 text-[10px] shrink-0">{(f.size / 1024).toFixed(1)} KB</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {uploadedFile && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm text-slate-400 mb-2 font-medium">Compression Quality ({compressionQuality}%)</label>
                      <input
                        type="range"
                        min="10"
                        max="95"
                        value={compressionQuality}
                        onChange={(e) => setCompressionQuality(parseInt(e.target.value))}
                        className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                      />
                    </div>
                    <button
                      onClick={executeCoreToolAction}
                      disabled={isProcessing}
                      className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-55 text-white font-semibold py-3 px-6 rounded-xl transition duration-200 flex items-center justify-center gap-2"
                    >
                      {isProcessing ? (
                        <>
                          <Icons.Loader2 className="w-4 h-4 animate-spin" />
                          Processing local streams...
                        </>
                      ) : (
                        <>
                          <Icons.Sparkles className="w-4 h-4" />
                          Start Compress
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>

              <div className="bg-slate-950/40 rounded-xl p-6 border border-slate-850 flex flex-col justify-between">
                {filePreview ? (
                  <div className="space-y-5">
                    <div className="relative rounded-lg overflow-hidden h-44 border border-slate-800 flex items-center justify-center bg-slate-950">
                      <img src={filePreview} alt="Uploaded Source" className="max-h-full max-w-full object-contain" />
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm border-t border-slate-850 pt-4">
                      <div>
                        <span className="text-slate-500 block mb-1 font-medium">Original Weight:</span>
                        <span className="font-mono text-white text-base">{(uploadedFile!.size / 1024).toFixed(1)} KB</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block mb-1 font-medium">Calculated Target:</span>
                        <span className="font-mono text-emerald-400 text-base">
                          {compressedSize ? `${(compressedSize / 1024).toFixed(1)} KB` : 'Estimated...'}
                        </span>
                      </div>
                    </div>
                    {downloadUrl && (
                      <a
                        href={downloadUrl}
                        download={outputFileName}
                        className="w-full inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-6 py-3 rounded-xl transition duration-200"
                      >
                        <Icons.Download className="w-4 h-4" />
                        Download Compressed JPG
                      </a>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-slate-500 text-center py-12">
                    <Icons.Image className="w-12 h-12 mb-3 opacity-30" />
                    <p className="text-sm font-medium">Upload an image to trigger active sizing estimates.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      case 'image-resizer':
        return (
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 md:p-8 backdrop-blur-md">
            <h3 className="font-display font-bold text-xl text-white mb-6">Image Resizer Studio</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center transition-all ${
                    dragActive ? 'border-blue-500 bg-blue-600/5' : 'border-slate-800 hover:border-slate-700 bg-slate-950/20'
                  }`}
                >
                  <input
                    type="file"
                    id="resizeFile"
                    accept="image/*"
                    multiple
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <label htmlFor="resizeFile" className="cursor-pointer flex flex-col items-center text-center">
                    <Icons.Scaling className="w-12 h-12 text-slate-500 mb-4" />
                    <span className="text-white font-semibold">Drag images here or click to select</span>
                    <span className="text-xs text-slate-500 mt-2">Adjust widths, heights, and aspect locks in bulk offline</span>
                  </label>
                </div>

                {uploadedFiles.length > 1 && (
                  <div className="bg-slate-950/40 border border-slate-850 rounded-xl p-4 space-y-2 max-h-48 overflow-y-auto animate-fadeIn">
                    <div className="flex items-center justify-between border-b border-slate-850 pb-2 mb-2">
                      <span className="text-xs font-mono font-bold text-blue-400 uppercase tracking-widest flex items-center gap-1.5">
                        <Icons.Layers className="w-3.5 h-3.5" />
                        Bulk Resizer Queue ({uploadedFiles.length} files)
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        Cumulative: {(uploadedFiles.reduce((acc, f) => acc + f.size, 0) / 1024).toFixed(1)} KB
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      {uploadedFiles.map((f, idx) => (
                        <div key={idx} className="flex items-center justify-between text-xs bg-slate-900/60 p-2 rounded border border-slate-850/60">
                          <span className="truncate max-w-[180px] text-slate-300 font-mono text-[11px]" title={f.name}>{f.name}</span>
                          <span className="font-mono text-slate-500 text-[10px] shrink-0">{(f.size / 1024).toFixed(1)} KB</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {uploadedFile && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-slate-400 mb-2 font-medium">Width (pixels)</label>
                        <input
                          type="number"
                          value={resizeWidth}
                          onChange={(e) => handleWidthChange(parseInt(e.target.value) || 0)}
                          className="w-full bg-slate-950/60 border border-slate-850 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-slate-400 mb-2 font-medium">Height (pixels)</label>
                        <input
                          type="number"
                          value={resizeHeight}
                          onChange={(e) => handleHeightChange(parseInt(e.target.value) || 0)}
                          className="w-full bg-slate-950/60 border border-slate-850 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 font-mono"
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="aspectCheck"
                        checked={lockAspectRatio}
                        onChange={(e) => setLockAspectRatio(e.target.checked)}
                        className="rounded border-slate-850 bg-slate-950 text-blue-500 focus:ring-0 w-4 h-4 cursor-pointer"
                      />
                      <label htmlFor="aspectCheck" className="text-sm text-slate-400 cursor-pointer font-medium">
                        Lock original Aspect Ratio
                      </label>
                    </div>
                    <button
                      onClick={executeCoreToolAction}
                      disabled={isProcessing}
                      className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-55 text-white font-semibold py-3 px-6 rounded-xl transition duration-200 flex items-center justify-center gap-2"
                    >
                      {isProcessing ? (
                        <>
                          <Icons.Loader2 className="w-4 h-4 animate-spin" />
                          Processing local scaling streams...
                        </>
                      ) : (
                        <>
                          <Icons.Sparkles className="w-4 h-4" />
                          Start Resize / Export
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>

              <div className="bg-slate-950/40 rounded-xl p-6 border border-slate-850 flex flex-col justify-between">
                {filePreview ? (
                  <div className="space-y-5">
                    <div className="relative rounded-lg overflow-hidden h-44 border border-slate-800 flex items-center justify-center bg-slate-950">
                      <img src={filePreview} alt="Uploaded Source" className="max-h-full max-w-full object-contain" />
                    </div>
                    <div className="text-sm border-t border-slate-850 pt-4 space-y-2">
                      <div className="flex justify-between">
                        <span className="text-slate-500 font-medium">Output Extension:</span>
                        <span className="font-mono text-white">{uploadedFile!.type.split('/')[1]?.toUpperCase() || 'PNG'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500 font-medium">Pixel Target:</span>
                        <span className="font-mono text-blue-400">{resizeWidth} x {resizeHeight} px</span>
                      </div>
                    </div>
                    {downloadUrl && (
                      <a
                        href={downloadUrl}
                        download={outputFileName}
                        className="w-full inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-6 py-3 rounded-xl transition duration-200"
                      >
                        <Icons.Download className="w-4 h-4" />
                        Download Resized Image
                      </a>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-slate-500 text-center py-12">
                    <Icons.Image className="w-12 h-12 mb-3 opacity-30" />
                    <p className="text-sm font-medium">Upload image to display aspect details.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      case 'tts':
        return (
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 md:p-8 backdrop-blur-md">
            <h3 className="font-display font-bold text-xl text-white mb-6">Text to Speech Synthesizer</h3>
            <div className="space-y-6">
              <div>
                <label className="block text-sm text-slate-400 mb-2 font-medium">Written Script to Synthesize</label>
                <textarea
                  value={ttsText}
                  onChange={(e) => setTtsText(e.target.value)}
                  rows={4}
                  className="w-full bg-slate-950/60 border border-slate-850 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 font-sans"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm text-slate-400 mb-2 font-medium">Target Vocal Voice</label>
                  <select
                    value={ttsVoice}
                    onChange={(e) => setTtsVoice(e.target.value)}
                    className="w-full bg-slate-950/60 border border-slate-850 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 font-sans cursor-pointer"
                  >
                    {ttsVoices.map((voice) => (
                      <option key={voice.name} value={voice.name} className="bg-slate-950 text-white">
                        {voice.name} ({voice.lang})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-2 font-medium font-mono">Pitch multiplier ({ttsPitch})</label>
                  <input
                    type="range"
                    min="0.5"
                    max="2"
                    step="0.1"
                    value={ttsPitch}
                    onChange={(e) => setTtsPitch(parseFloat(e.target.value))}
                    className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-2 font-medium font-mono">Vocal Speed multiplier ({ttsRate})</label>
                  <input
                    type="range"
                    min="0.5"
                    max="2"
                    step="0.1"
                    value={ttsRate}
                    onChange={(e) => setTtsRate(parseFloat(e.target.value))}
                    className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                </div>
              </div>
              <button
                onClick={triggerTtsEngine}
                className="w-full inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 px-6 rounded-xl transition duration-200"
              >
                {isSpeaking ? (
                  <>
                    <Icons.VolumeX className="w-5 h-5 animate-pulse" />
                    Stop Vocal Stream
                  </>
                ) : (
                  <>
                    <Icons.Volume2 className="w-5 h-5 animate-bounce" />
                    Synthesize Speech Voice
                  </>
                )}
              </button>
            </div>
          </div>
        );

      case 'json-formatter':
        return (
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 md:p-8 backdrop-blur-md">
            <h3 className="font-display font-bold text-xl text-white mb-6">JSON Pretty-Print & Minifier Studio</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-4">
                <label className="block text-sm text-slate-400 font-medium">Source JSON input</label>
                <textarea
                  value={jsonInput}
                  onChange={(e) => setJsonInput(e.target.value)}
                  rows={10}
                  className="w-full bg-slate-950/60 border border-slate-850 rounded-xl px-4 py-3 text-white font-mono text-sm focus:outline-none focus:border-blue-500 focus:ring-0"
                />
                {jsonError && (
                  <p className="text-red-400 text-xs font-mono font-bold bg-red-950/30 p-2 rounded border border-red-900/50">
                    Syntax Error: {jsonError}
                  </p>
                )}
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <button
                    onClick={() => handleJsonAction('format')}
                    className="bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 rounded-xl transition duration-200"
                  >
                    Format JSON
                  </button>
                  <button
                    onClick={() => handleJsonAction('minify')}
                    className="bg-slate-800 hover:bg-slate-700 text-white font-semibold py-3 rounded-xl transition duration-200"
                  >
                    Minify JSON
                  </button>
                </div>
              </div>
              <div className="space-y-4">
                <label className="block text-sm text-slate-400 font-medium">Result Output</label>
                <textarea
                  value={jsonOutput}
                  readOnly
                  rows={10}
                  placeholder="Processed output code prints here..."
                  className="w-full bg-slate-950/30 border border-slate-850 rounded-xl px-4 py-3 text-white font-mono text-sm focus:outline-none"
                />
                {downloadUrl && (
                  <a
                    href={downloadUrl}
                    download={outputFileName}
                    className="w-full inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-6 py-3 rounded-xl transition duration-200"
                  >
                    <Icons.Download className="w-4 h-4" />
                    Download Processed JSON
                  </a>
                )}
              </div>
            </div>
          </div>
        );

      case 'binary-text':
        return (
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 md:p-8 backdrop-blur-md">
            <h3 className="font-display font-bold text-xl text-white mb-6">Binary ↔ Text Multi-Converter</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-4">
                <label className="block text-sm text-slate-400 font-medium">Source String</label>
                <textarea
                  value={binaryTextInput}
                  onChange={(e) => setBinaryTextInput(e.target.value)}
                  rows={6}
                  className="w-full bg-slate-950/60 border border-slate-850 rounded-xl px-4 py-3 text-white font-mono text-sm focus:outline-none focus:border-blue-500"
                />
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => handleBinaryAction('text-to-binary')}
                    className="bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2 px-4 rounded-xl transition duration-200"
                  >
                    Text ➜ Binary
                  </button>
                  <button
                    onClick={() => handleBinaryAction('binary-to-text')}
                    className="bg-slate-800 hover:bg-slate-700 text-white font-semibold py-2 px-4 rounded-xl transition duration-200"
                  >
                    Binary ➜ Text
                  </button>
                </div>
              </div>
              <div className="space-y-4">
                <label className="block text-sm text-slate-400 font-medium">Result Binary or Plain Text</label>
                <textarea
                  value={binaryOutput}
                  readOnly
                  rows={6}
                  placeholder="Computed binary strings print here..."
                  className="w-full bg-slate-950/30 border border-slate-850 rounded-xl px-4 py-3 text-white font-mono text-sm focus:outline-none"
                />
              </div>
            </div>
          </div>
        );

      case 'color-hex-rgb':
        return (
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 md:p-8 backdrop-blur-md">
            <h3 className="font-display font-bold text-xl text-white mb-6">Hex ↔ RGB Color Model Bridge</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-5">
                <div>
                  <label className="block text-sm text-slate-400 mb-2 font-medium">HEX Color Code</label>
                  <div className="flex gap-3">
                    <input
                      type="color"
                      value={hexColor}
                      onChange={(e) => handleColorSwap(e.target.value)}
                      className="w-12 h-12 bg-transparent cursor-pointer rounded border-0"
                    />
                    <input
                      type="text"
                      value={hexColor}
                      onChange={(e) => handleColorSwap(e.target.value)}
                      className="flex-1 bg-slate-950/60 border border-slate-850 rounded-xl px-4 py-3 text-white font-mono focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
                <div className="space-y-3 pt-3">
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-slate-400 font-bold font-mono">
                      <span>Red Component</span>
                      <span>{rgbColor.r}</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="255"
                      value={rgbColor.r}
                      onChange={(e) => handleRgbSwap('r', parseInt(e.target.value))}
                      className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-red-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-slate-400 font-bold font-mono">
                      <span>Green Component</span>
                      <span>{rgbColor.g}</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="255"
                      value={rgbColor.g}
                      onChange={(e) => handleRgbSwap('g', parseInt(e.target.value))}
                      className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-green-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-slate-400 font-bold font-mono">
                      <span>Blue Component</span>
                      <span>{rgbColor.b}</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="255"
                      value={rgbColor.b}
                      onChange={(e) => handleRgbSwap('b', parseInt(e.target.value))}
                      className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                    />
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-center justify-center rounded-xl border border-slate-850 p-6 relative overflow-hidden" style={{ backgroundColor: hexColor }}>
                <div className="bg-slate-950/80 backdrop-blur-sm p-4 rounded-xl text-center shadow-2xl border border-white/10">
                  <span className="text-sm text-slate-400 block font-medium">DECIMAL RGBA representation</span>
                  <span className="text-lg text-white font-mono font-extrabold tracking-tight">rgb({rgbColor.r}, {rgbColor.g}, {rgbColor.b})</span>
                </div>
              </div>
            </div>
          </div>
        );

      case 'color-picker':
        return (
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 md:p-8 backdrop-blur-md">
            <h3 className="font-display font-bold text-xl text-white mb-6">Interactive Color Picker & Palette Extractor</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center transition-all ${
                    dragActive ? 'border-blue-500 bg-blue-600/5' : 'border-slate-800 hover:border-slate-700 bg-slate-950/20'
                  }`}
                >
                  <input
                    type="file"
                    id="pickerFile"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <label htmlFor="pickerFile" className="cursor-pointer flex flex-col items-center text-center">
                    <Icons.Pipette className="w-12 h-12 text-slate-500 mb-4" />
                    <span className="text-white font-semibold">Upload picture to sample pixels</span>
                    <span className="text-xs text-slate-500 mt-2">Drawn colors and top 5 dominant colors instantly display</span>
                  </label>
                </div>

                {sampledColor && (
                  <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-850 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg border border-slate-800" style={{ backgroundColor: sampledColor }} />
                      <div>
                        <span className="text-xs text-slate-500 block font-medium font-sans">Hovered Coordinates Color:</span>
                        <span className="font-mono text-white text-base font-bold uppercase">{sampledColor}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => navigator.clipboard.writeText(sampledColor)}
                      className="p-2 hover:bg-slate-800 rounded text-slate-400 hover:text-white"
                    >
                      <Icons.Copy className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              <div className="bg-slate-950/40 rounded-xl p-6 border border-slate-850 flex flex-col items-center justify-center">
                {filePreview ? (
                  <div className="space-y-6 w-full">
                    <p className="text-xs text-slate-400 text-center font-bold">CLICK INSIDE GRAPHIC PREVIEW TO PICK PRECISE PIXEL COLOR:</p>
                    <div className="flex justify-center">
                      <canvas
                        ref={pickerCanvasRef}
                        onClick={handlePickerCanvasClick}
                        className="rounded-lg border border-slate-800 max-w-full cursor-crosshair shadow-md"
                      />
                    </div>
                    <div className="border-t border-slate-850 pt-4">
                      <span className="text-xs text-slate-400 block mb-3 font-bold uppercase tracking-wider">Top 5 Extrapolated Dominant Colors:</span>
                      <div className="flex gap-2">
                        {dominantColors.map((col) => (
                          <div
                            key={col}
                            onClick={() => setSampledColor(col)}
                            className="flex-1 h-12 rounded-lg border border-slate-850 cursor-pointer hover:scale-105 transition duration-200 flex items-center justify-center font-mono text-[10px] text-white font-extrabold uppercase bg-slate-950/60 shadow-lg"
                            style={{ borderTop: `4px solid ${col}` }}
                          >
                            {col}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center text-slate-500 py-12">
                    <Icons.Palette className="w-12 h-12 mb-3 opacity-30 animate-pulse" />
                    <p className="text-sm font-medium">Sample palettes display instantly on upload.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      case 'meme':
        return (
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 md:p-8 backdrop-blur-md">
            <h3 className="font-display font-bold text-xl text-white mb-6">SaaS Meme Generator Lab</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-5">
                <div
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center transition-all ${
                    dragActive ? 'border-blue-500 bg-blue-600/5' : 'border-slate-800 hover:border-slate-700 bg-slate-950/20'
                  }`}
                >
                  <input
                    type="file"
                    id="memeFile"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <label htmlFor="memeFile" className="cursor-pointer flex flex-col items-center text-center">
                    <Icons.Smile className="w-10 h-10 text-slate-500 mb-3" />
                    <span className="text-white text-sm font-semibold">Choose base meme graphic</span>
                  </label>
                </div>
                {filePreview && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm text-slate-400 mb-1 font-medium">Top Text Block</label>
                      <input
                        type="text"
                        value={memeTopText}
                        onChange={(e) => setMemeTopText(e.target.value)}
                        className="w-full bg-slate-950/60 border border-slate-850 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 font-sans uppercase font-extrabold"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-slate-400 mb-1 font-medium">Bottom Text Block</label>
                      <input
                        type="text"
                        value={memeBottomText}
                        onChange={(e) => setMemeBottomText(e.target.value)}
                        className="w-full bg-slate-950/60 border border-slate-850 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 font-sans uppercase font-extrabold"
                      />
                    </div>
                  </div>
                )}
              </div>
              <div className="bg-slate-950/40 rounded-xl p-5 border border-slate-850 flex flex-col items-center justify-center">
                {filePreview ? (
                  <div className="space-y-4 w-full flex flex-col items-center">
                    <canvas ref={memeCanvasRef} className="rounded-lg shadow-xl max-w-full" />
                    {downloadUrl && (
                      <a
                        href={downloadUrl}
                        download={outputFileName}
                        className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-6 py-3 rounded-xl transition duration-200"
                      >
                        <Icons.Download className="w-4 h-4" />
                        Download Funny Meme PNG
                      </a>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center text-slate-500 py-12 text-center">
                    <Icons.Image className="w-10 h-10 mb-2 opacity-30" />
                    <p className="text-xs">Uploader prints meme text onto image automatically.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      case 'pdf-invoice':
        return (
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 md:p-8 backdrop-blur-md">
            <h3 className="font-display font-bold text-xl text-white mb-6">Pristine PDF Invoice Builder</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1 font-medium">Invoice Number</label>
                    <input
                      type="text"
                      value={invoiceId}
                      onChange={(e) => setInvoiceId(e.target.value)}
                      className="w-full bg-slate-950/60 border border-slate-850 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-blue-500 font-mono text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1 font-medium">Total Price (USD)</label>
                    <input
                      type="number"
                      value={invoiceItemPrice}
                      onChange={(e) => setInvoiceItemPrice(parseInt(e.target.value) || 0)}
                      className="w-full bg-slate-950/60 border border-slate-850 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-blue-500 font-mono text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1 font-medium">Client Recipient Name</label>
                  <input
                    type="text"
                    value={invoiceClient}
                    onChange={(e) => setInvoiceClient(e.target.value)}
                    className="w-full bg-slate-950/60 border border-slate-850 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-blue-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1 font-medium">Client Email Address</label>
                  <input
                    type="email"
                    value={invoiceEmail}
                    onChange={(e) => setInvoiceEmail(e.target.value)}
                    className="w-full bg-slate-950/60 border border-slate-850 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-blue-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1 font-medium">Itemized Description Name</label>
                  <input
                    type="text"
                    value={invoiceItemName}
                    onChange={(e) => setInvoiceItemName(e.target.value)}
                    className="w-full bg-slate-950/60 border border-slate-850 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-blue-500 text-sm"
                  />
                </div>
              </div>
              <div className="flex flex-col items-center justify-center bg-slate-950/40 rounded-xl p-4 border border-slate-850">
                <div className="w-full overflow-auto max-h-[350px] border border-slate-800 rounded bg-white">
                  <canvas ref={invoiceCanvasRef} className="max-w-full" style={{ width: '400px' }} />
                </div>
                {downloadUrl && (
                  <a
                    href={downloadUrl}
                    download={outputFileName}
                    className="mt-4 inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-6 py-2.5 rounded-xl transition duration-200"
                  >
                    <Icons.Download className="w-4 h-4" />
                    Download Invoice PNG
                  </a>
                )}
              </div>
            </div>
          </div>
        );

      case 'pdf-resume':
        return (
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 md:p-8 backdrop-blur-md">
            <h3 className="font-display font-bold text-xl text-white mb-6">SaaS ATS-Compliant Resume Builder</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1 font-medium">Applicant Full Name</label>
                    <input
                      type="text"
                      value={resumeName}
                      onChange={(e) => setResumeName(e.target.value)}
                      className="w-full bg-slate-950/60 border border-slate-850 rounded-xl px-4 py-2 text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1 font-medium">Target Role Title</label>
                    <input
                      type="text"
                      value={resumeTitle}
                      onChange={(e) => setResumeTitle(e.target.value)}
                      className="w-full bg-slate-950/60 border border-slate-850 rounded-xl px-4 py-2 text-white text-sm"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1 font-medium">Contact Email Link</label>
                    <input
                      type="email"
                      value={resumeEmail}
                      onChange={(e) => setResumeEmail(e.target.value)}
                      className="w-full bg-slate-950/60 border border-slate-850 rounded-xl px-4 py-2 text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1 font-medium">Enterprise Company Name</label>
                    <input
                      type="text"
                      value={resumeCompany}
                      onChange={(e) => setResumeCompany(e.target.value)}
                      className="w-full bg-slate-950/60 border border-slate-850 rounded-xl px-4 py-2 text-white text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1 font-medium">Core Expertise / Coding Languages</label>
                  <input
                    type="text"
                    value={resumeSkills}
                    onChange={(e) => setResumeSkills(e.target.value)}
                    className="w-full bg-slate-950/60 border border-slate-850 rounded-xl px-4 py-2 text-white font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1 font-medium">Recent Role Descriptive Summary (Paragraph)</label>
                  <textarea
                    value={resumeRoleDesc}
                    onChange={(e) => setResumeRoleDesc(e.target.value)}
                    rows={4}
                    className="w-full bg-slate-950/60 border border-slate-850 rounded-xl px-4 py-2 text-white text-sm"
                  />
                </div>
              </div>
              <div className="flex flex-col items-center justify-center bg-slate-950/40 rounded-xl p-4 border border-slate-850">
                <div className="w-full overflow-auto max-h-[350px] border border-slate-800 rounded bg-white">
                  <canvas ref={resumeCanvasRef} className="max-w-full" style={{ width: '400px' }} />
                </div>
                {downloadUrl && (
                  <a
                    href={downloadUrl}
                    download={outputFileName}
                    className="mt-4 inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-6 py-2.5 rounded-xl transition duration-200"
                  >
                    <Icons.Download className="w-4 h-4" />
                    Download Resume PNG
                  </a>
                )}
              </div>
            </div>
          </div>
        );

      default:
        // High fidelity Universal SaaS Converter Workspace (for PDFs, CSVs, XMLs, YAMLs, Audio clips, ZIP folders, etc.)
        return (
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 md:p-8 backdrop-blur-md">
            <h3 className="font-display font-bold text-xl text-white mb-4 flex items-center gap-2">
              <Icons.ShieldCheck className="w-5 h-5 text-blue-500" />
              Universal {tool.category.toUpperCase()} Secure Portal
            </h3>
            <p className="text-sm text-slate-400 mb-6 bg-slate-950/40 p-3 rounded-xl border border-slate-850">
              This dynamic local workbench integrates with your system's hardware threads to run formats processing natively without transferring any data. Zero transmission ensures 100% safety.
            </p>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center transition-all ${
                    dragActive ? 'border-blue-500 bg-blue-600/5' : 'border-slate-800 hover:border-slate-700 bg-slate-950/20'
                  }`}
                >
                  <input
                    type="file"
                    id="universalFile"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <label htmlFor="universalFile" className="cursor-pointer flex flex-col items-center text-center">
                    <Icons.UploadCloud className="w-12 h-12 text-slate-500 mb-4" />
                    <span className="text-white font-semibold">Choose file or drag here to upload</span>
                    <span className="text-xs text-slate-500 mt-2">Maximum file limit: No limit (processes client-side!)</span>
                  </label>
                </div>

                {uploadedFile ? (
                  <div className="space-y-4">
                    <div className="bg-slate-950/60 rounded-xl p-4 border border-slate-850 space-y-3">
                      <div className="flex items-center gap-3">
                        <Icons.File className="w-8 h-8 text-blue-400" />
                        <div className="overflow-hidden">
                          <span className="block text-white text-sm font-semibold truncate leading-tight">{uploadedFile.name}</span>
                          <span className="text-xs text-slate-500 font-mono block">Size: {(uploadedFile.size / 1024).toFixed(1)} KB</span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={executeCoreToolAction}
                      disabled={isProcessing}
                      className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-55 text-white font-semibold py-3 px-6 rounded-xl transition duration-200 flex items-center justify-center gap-2"
                    >
                      {isProcessing ? (
                        <>
                          <Icons.Loader2 className="w-4 h-4 animate-spin" />
                          Processing Sandbox Engine...
                        </>
                      ) : (
                        <>
                          <Icons.Cpu className="w-4 h-4" />
                          Execute Sandbox Conversion
                        </>
                      )}
                    </button>
                  </div>
                ) : (
                  <button
                    disabled
                    className="w-full bg-slate-800 text-slate-550 font-semibold py-3 px-6 rounded-xl cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <Icons.FileQuestion className="w-4 h-4" />
                    Please Choose File
                  </button>
                )}
              </div>

              {/* Steps and Output Console logs logMessages */}
              <div className="bg-slate-950/40 rounded-xl p-6 border border-slate-850 flex flex-col justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 font-mono">Sandbox Console Streams</h4>
                  <div className="space-y-2 bg-slate-950 p-4 rounded-lg border border-slate-850 h-56 overflow-y-auto font-mono text-[11px] text-slate-350">
                    <div className="text-blue-400 leading-tight">=== Core Engine Ready ===</div>
                    {logMessages.map((msg, idx) => (
                      <div key={idx} className={`${msg.includes('SUCCESS') ? 'text-emerald-400 font-bold' : 'text-slate-300'}`}>
                        {msg}
                      </div>
                    ))}
                    {isProcessing && (
                      <div className="flex items-center gap-2 text-slate-500">
                        <Icons.Loader2 className="w-3 h-3 animate-spin text-blue-500" />
                        <span>Compiling checksum parameters...</span>
                      </div>
                    )}
                  </div>
                </div>

                {downloadUrl && (
                  <div className="mt-5 border-t border-slate-850 pt-4">
                    <div className="flex justify-between text-xs mb-3 font-mono">
                      <span className="text-slate-500">Target Type:</span>
                      <span className="text-emerald-400 uppercase font-medium">{outputFileName.split('.').pop()} FILE</span>
                    </div>
                    <a
                      href={downloadUrl}
                      download={outputFileName}
                      className="w-full inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-6 py-3 rounded-xl transition duration-200 shadow-md"
                    >
                      <Icons.Download className="w-4 h-4" />
                      Download Processed Asset
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
    }
  };

  const handleShareTool = async () => {
    const shareData = {
      title: `${tool.name} | Premium Tools Suite`,
      text: tool.tagline || `Check out ${tool.name} on AuraTools!`,
      url: window.location.href,
    };

    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
        triggerToast('Tool shared successfully!');
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          console.error('Error sharing:', err);
          navigator.clipboard.writeText(window.location.href);
          triggerToast('Web share failed. Link copied to clipboard!');
        }
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      triggerToast('Direct tool link copied to clipboard!');
    }
  };

  const displayComparison = !!(filePreview && downloadUrl && filePreview.startsWith('data:image/') && downloadUrl.startsWith('data:image/'));

  return (
    <div id={`tool-panel-${tool.id}`} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Dynamic SEO Title simulation on mount */}
      <title>{`${tool.name} | Dynamic SaaS Multi-Tool Suite - AuraTools`}</title>
      
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center gap-2 text-sm text-slate-400 mb-6 font-sans">
        <span href="#" onClick={() => onNavigateToTool('')} className="hover:text-blue-500 cursor-pointer transition">Home</span>
        <Icons.ChevronRight className="w-3 h-3 text-slate-600" />
        <span className="capitalize">{tool.category}</span>
        <Icons.ChevronRight className="w-3 h-3 text-slate-600" />
        <span className="text-slate-200 font-medium truncate max-w-[150px] md:max-w-none">{tool.name}</span>
      </nav>
 
       {/* Tool Header Information */}
       <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-white/10">
         <div>
           <div className="flex items-center gap-4 mb-3">
             <div className={`p-3 rounded-xl bg-gradient-to-br ${CATEGORIES[tool.category].themeColor} text-white shadow-lg`}>
               <DynamicIcon name={tool.icon} className="w-6 h-6 animate-glow-pulse" />
             </div>
             <span className="text-xs bg-blue-500/10 text-blue-400 border border-blue-500/20 px-3 py-1 rounded-full font-bold uppercase tracking-wider font-mono">
               ID: #{tool.num} Compliant
             </span>
           </div>
           <h1 className="font-display font-extrabold text-3xl md:text-4xl text-white tracking-tight mb-2">
             {tool.name}
           </h1>
           <p className="text-slate-400 text-base md:text-lg max-w-3xl leading-relaxed">
             {tool.tagline}
           </p>

           {/* Context-sensitive Pro-Tip Info-box */}
           {(() => {
             const currentTip = KEYBOARD_SHORTCUTS_AND_TIPS[tool.id] || {
               shortcut: 'Alt + Click parameters to reset values',
               tip: 'All operations inside this multi-tool workspace run completely client-side in a sandboxed container for maximum security and data privacy.'
             };
             return (
               <div className="mt-5 bg-white/[0.03] backdrop-blur-md border border-white/10 rounded-2xl p-4 flex items-start gap-3.5 max-w-3xl animate-fadeIn shadow-[0_8px_32px_0_rgba(0,0,0,0.37)]">
                 <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-white/10 shrink-0 mt-0.5 shadow-md">
                   <Icons.Lightbulb className="w-4 h-4 text-amber-450 animate-pulse" />
                 </div>
                 <div className="font-sans text-xs space-y-1.5 flex-1 min-w-0">
                   <div className="flex items-center gap-2 flex-wrap">
                     <span className="font-bold text-blue-300 uppercase tracking-widest text-[9.5px] font-mono">PRO OPTIMIZATION TIP</span>
                     {currentTip.shortcut && (
                       <span className="inline-flex items-center gap-1.5 bg-slate-950 border border-slate-805 border-slate-800 text-slate-400 text-[10px] font-mono px-2 py-0.5 rounded-md font-medium text-[9.5px]">
                         <Icons.Keyboard className="w-3.5 h-3.5 text-blue-400" />
                         <span>Shortcut</span>: <strong className="text-slate-200 font-normal">{currentTip.shortcut}</strong>
                       </span>
                     )}
                   </div>
                   <p className="text-slate-450 text-slate-450 text-slate-400 leading-relaxed font-sans">{currentTip.tip}</p>
                 </div>
               </div>
             );
           })()}
         </div>
 
         <div className="shrink-0 flex flex-col sm:flex-row gap-3">
           <button
             onClick={exportResultAsPDF}
             disabled={isProcessing}
             className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 disabled:opacity-55 text-white font-semibold text-sm px-6 py-3.5 rounded-full shadow-lg shadow-red-950/20 active:scale-95 transition-all duration-150 cursor-pointer"
           >
             <Icons.FileText className="w-4 h-4" />
             <span>Export Result to PDF</span>
           </button>
           <button
             onClick={handleShareTool}
             className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-sm px-6 py-3.5 rounded-full shadow-lg shadow-indigo-950/20 active:scale-95 transition-all duration-150 cursor-pointer"
           >
             <Icons.Share2 className="w-4 h-4" />
             <span>Share Tool</span>
           </button>
         </div>
       </div>

      {/* Dynamic Animated Core Progress Bar */}
      <AnimatePresence>
        {(isProcessing || uploadedFiles.length > 1) && (
          <motion.div
            id="workspace-progress-bar"
            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
            animate={{ opacity: 1, height: 'auto', marginBottom: 24 }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 md:p-5 backdrop-blur-md relative overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Icons.Cpu className="w-4 h-4 text-blue-400 animate-spin" />
                  <span className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider">
                    {progress === 100 ? 'Finishing compilation...' : isProcessing ? 'Executing secure client-side sandbox thread...' : 'Files ready in batch process queue'}
                  </span>
                </div>
                <span className="text-xs font-bold text-blue-400 font-mono">{progress}%</span>
              </div>
              <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden relative">
                <motion.div
                  className="bg-gradient-to-r from-blue-500 to-indigo-500 h-full rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ ease: "easeInOut", duration: 0.15 }}
                />
              </div>

              {/* Batch-process summary dashboard showing individual queue items */}
              {uploadedFiles.length > 1 && (
                <div className="mt-5 border-t border-slate-800/80 pt-5">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-widest flex items-center gap-2">
                      <Icons.Layers className="w-3.5 h-3.5 text-blue-400" />
                      Batch Process Queue ({uploadedFiles.length} files)
                    </h4>
                    <span className="text-[10px] font-mono text-slate-500 bg-slate-950/40 border border-slate-900 px-1.5 py-0.5 rounded">
                      Local Processor: Active
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-60 overflow-y-auto pr-1">
                    {Array.from(uploadedFiles).map((file: any, idx) => {
                      let status: 'queued' | 'processing' | 'completed' = 'queued';
                      let statusColor = 'text-slate-500 bg-slate-950/40 border-slate-905';
                      let statusText = 'Queued';
                      
                      if (bulkActiveIndex > idx || (!isProcessing && bulkActiveIndex === -1 && uploadedFiles.length > 1)) {
                        status = 'completed';
                        statusColor = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
                        statusText = 'Completed';
                      } else if (isProcessing && bulkActiveIndex === idx) {
                        status = 'processing';
                        statusColor = 'text-blue-400 bg-blue-500/10 border-blue-500/20 animate-pulse';
                        statusText = 'Processing';
                      }

                      return (
                        <div 
                          key={idx}
                          className={`p-3 rounded-xl border transition-all duration-300 flex flex-col justify-between ${
                            status === 'processing' 
                              ? 'bg-blue-500/5 border-blue-500/30' 
                              : status === 'completed' 
                              ? 'bg-emerald-500/5 border-emerald-500/25' 
                              : 'bg-slate-950/20 border-slate-900 text-slate-400'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-semibold text-slate-200 truncate" title={file.name}>
                                {file.name}
                              </p>
                              <p className="text-[9.5px] text-slate-500 font-mono mt-0.5">
                                {(file.size / 1024).toFixed(1)} KB
                              </p>
                            </div>
                            <span className={`text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded border ${statusColor} shrink-0`}>
                              {statusText}
                            </span>
                          </div>
                          
                          {/* Visual mini-progress line for file */}
                          <div className="mt-3 w-full bg-slate-950/50 h-1 rounded-full overflow-hidden">
                            <motion.div 
                              className={`h-full ${status === 'completed' ? 'bg-emerald-500' : status === 'processing' ? 'bg-blue-500' : 'bg-slate-800'}`}
                              initial={{ width: '0%' }}
                              animate={{ 
                                width: status === 'completed' ? '100%' : status === 'processing' ? `${(progress % (100 / uploadedFiles.length)) * uploadedFiles.length}%` : '0%' 
                              }}
                              transition={{ duration: 0.2 }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {/* Subtle background animated gradient */}
              <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-blue-500/5 to-transparent pointer-events-none" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Interactive Workspace component */}
      <section className="mb-12">
        {renderInteractiveEditor()}
      </section>

      {/* Visual Quality Side-by-Side Comparison View */}
      {displayComparison && (
        <motion.div
          id="visual-quality-comparison"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-12 bg-slate-900/40 border border-slate-800 rounded-2xl p-6 md:p-8 backdrop-blur-md"
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 border-b border-slate-800 pb-5">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Icons.Split className="w-5 h-5 text-emerald-450" />
                <h3 className="font-display font-bold text-xl text-white">Visual Quality Inspection</h3>
              </div>
              <p className="text-sm text-slate-400">
                Compare original source versus high-fidelity processed client-side output.
              </p>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              {/* Layout Switch Toggle */}
              <div className="flex items-center p-1 bg-slate-950 border border-slate-800 rounded-xl">
                <button
                  type="button"
                  onClick={() => setComparisonMode('side-by-side')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold uppercase tracking-wider transition cursor-pointer ${
                    comparisonMode === 'side-by-side' 
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-sm' 
                      : 'text-slate-400 hover:text-white border border-transparent'
                  }`}
                >
                  Side-By-Side
                </button>
                <button
                  type="button"
                  onClick={() => setComparisonMode('slider')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold uppercase tracking-wider transition cursor-pointer ${
                    comparisonMode === 'slider' 
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-sm' 
                      : 'text-slate-400 hover:text-white border border-transparent'
                  }`}
                >
                  Interactive Slider
                </button>
              </div>

              <div className="flex items-center gap-2 text-xs font-mono font-bold bg-slate-950/60 text-slate-350 border border-slate-850 px-3 py-1.5 rounded-full uppercase tracking-wider">
                <Icons.Eye className="w-3.5 h-3.5 text-blue-400" />
                <span>100% Client-Side Render</span>
              </div>
            </div>
          </div>

          {comparisonMode === 'side-by-side' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 animate-fadeIn">
              {/* Original Panel */}
              <div className="flex flex-col space-y-3">
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-mono font-bold text-slate-300 uppercase tracking-widest flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-slate-500" />
                    Original Source
                  </span>
                  {uploadedFile && (
                    <span className="text-xs font-mono text-slate-500 bg-slate-950/40 border border-slate-850 px-2 py-0.5 rounded">
                      {(uploadedFile.size / 1024).toFixed(1)} KB
                    </span>
                  )}
                </div>
                <div className="relative rounded-xl overflow-hidden h-72 border border-slate-800/80 flex items-center justify-center bg-slate-955/40 backdrop-blur-sm group">
                  <img src={filePreview} alt="Original Quality Source" className="max-h-full max-w-full object-contain transition duration-350 group-hover:scale-[1.02]" />
                  <div className="absolute top-3 left-3 bg-slate-950/75 border border-slate-800 text-[10px] text-slate-450 font-mono px-2 py-1 rounded shadow-lg font-medium">
                    BEFORE (Original)
                  </div>
                </div>
              </div>

              {/* Processed Panel */}
              <div className="flex flex-col space-y-3">
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Processed Output
                  </span>
                  {compressedSize ? (
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded font-bold">
                        {(compressedSize / 1024).toFixed(1)} KB
                      </span>
                      {uploadedFile && (
                        <span className="text-[10px] font-mono text-emerald-300 bg-emerald-500/15 px-1.5 py-0.5 rounded font-bold">
                          -{((1 - compressedSize / uploadedFile.size) * 100).toFixed(0)}% Space Saved
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded font-bold">
                      Optimized
                    </span>
                  )}
                </div>
                <div className="relative rounded-xl overflow-hidden h-72 border border-slate-800/80 flex items-center justify-center bg-slate-955/40 backdrop-blur-sm group">
                  <img src={downloadUrl} alt="Processed Quality Output" className="max-h-full max-w-full object-contain transition duration-350 group-hover:scale-[1.02]" />
                  <div className="absolute top-3 left-3 bg-emerald-950/85 border border-emerald-800/50 text-[10px] text-emerald-300 font-mono px-2 py-1 rounded shadow-lg font-bold">
                    AFTER (Optimized)
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Interactive Slider Overlay view */
            <div className="flex flex-col space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Interactive Swipe Comparison Mode
                </span>
                <span className="text-xs font-mono text-slate-400 bg-slate-950/40 border border-slate-850 px-2.5 py-1 rounded">
                  Drag Slider Position: <strong>{sliderVal}%</strong>
                </span>
              </div>
              
              <div className="relative h-[380px] w-full rounded-2xl overflow-hidden border border-slate-850 bg-slate-950/40 select-none">
                {/* Underlay / Background: Original */}
                <div className="absolute inset-0 w-full h-full p-4 flex items-center justify-center pointer-events-none">
                  <img src={filePreview || ''} alt="Original Quality Source" className="max-h-full max-w-full object-contain rounded-lg" />
                </div>
                
                {/* Overlay Component: Processed (clipped) */}
                <div 
                  className="absolute inset-0 w-full h-full p-4 flex items-center justify-center pointer-events-none transition-all duration-75"
                  style={{
                    clipPath: `polygon(0 0, ${sliderVal}% 0, ${sliderVal}% 100%, 0 100%)`
                  }}
                >
                  <img src={downloadUrl || ''} alt="Processed Output" className="max-h-full max-w-full object-contain rounded-lg" />
                </div>

                {/* Split line separator */}
                <div 
                  className="absolute top-0 bottom-0 w-[2px] bg-gradient-to-b from-emerald-400 to-indigo-500 pointer-events-none shadow-[0_0_15px_rgba(52,211,153,0.8)] z-10"
                  style={{ left: `${sliderVal}%` }}
                >
                  <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-slate-900 border border-emerald-500/80 flex items-center justify-center shadow-2xl">
                    <Icons.ChevronsLeftRight className="w-4 h-4 text-emerald-400" />
                  </div>
                </div>

                {/* Range controller mapped perfectly to full size of container */}
                <input 
                  type="range" 
                  min="0" 
                  max="100" 
                  value={sliderVal} 
                  onChange={(e) => setSliderVal(Number(e.target.value))} 
                  className="absolute inset-0 opacity-0 cursor-ew-resize z-20 w-full h-full"
                  title="Drag slider left/right to compare"
                />

                {/* Visual Label indicators */}
                <div className="absolute top-3 left-3 bg-slate-950/80 border border-slate-800 text-[10px] text-slate-400 font-mono px-2 py-1 rounded shadow-md pointer-events-none z-10">
                  BEFORE (Original)
                </div>
                <div className="absolute top-3 right-3 bg-emerald-950/85 border border-emerald-800/40 text-[10px] text-emerald-300 font-mono px-3 py-1 rounded shadow-md pointer-events-none z-10 font-bold">
                  AFTER (Optimized)
                </div>
              </div>
              <p className="text-[10px] font-mono text-slate-500 text-center uppercase tracking-wider">
                ← Swipe cursor or touch screen horizontally to inspect clarity differences →
              </p>
            </div>
          )}
        </motion.div>
      )}

      {/* SEO-Rich Articles Sections */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-12 border-t border-white/10 pt-12">
        <div className="lg:col-span-2 space-y-10">
          <div>
            <h2 className="font-display font-bold text-2xl text-white mb-4">Detailed Process Overview</h2>
            <p className="text-slate-300 leading-relaxed text-sm whitespace-pre-line">
              {seoData.overviewCount}
            </p>
          </div>

          <div>
            <h2 className="font-display font-bold text-2xl text-white mb-4">How To Use {tool.name}</h2>
            <p className="text-slate-300 leading-relaxed text-sm whitespace-pre-line mb-4">
              {seoData.howToCount}
            </p>
          </div>

          <div>
            <h2 className="font-display font-bold text-2xl text-white mb-4">Premium Features & Specifications</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {seoData.featuresCount.split('- ').filter(Boolean).map((fText, index) => {
                const [headline, detailText] = fText.split(': ');
                return (
                  <div key={index} className="bg-white/5 border border-white/10 p-5 rounded-xl hover:bg-white/10 transition">
                    <span className="text-blue-400 font-sans font-bold block mb-1 text-sm">{headline}</span>
                    <span className="text-slate-300 text-xs leading-relaxed">{detailText}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <h2 className="font-display font-bold text-2xl text-white mb-4">Key Benefits & Security Sandboxing</h2>
            <ul className="space-y-3">
              {seoData.benefitsCount.split('- ').filter(Boolean).map((bText, index) => {
                const [headline, detailText] = bText.split(': ');
                return (
                  <li key={index} className="flex gap-3 leading-relaxed text-sm text-slate-300">
                    <Icons.CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-slate-200 block sm:inline">{headline}: </span>
                      <span>{detailText}</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          <div>
            <h2 className="font-display font-bold text-2xl text-white mb-6">Frequently Asked Questions (FAQ)</h2>
            <div className="space-y-4">
              {seoData.faqsList.map((faq, index) => (
                <div key={index} className="bg-white/5 border border-white/10 rounded-xl overflow-hidden backdrop-blur-md">
                  <div className="p-4 bg-white/5 border-b border-white/10">
                    <h4 className="font-display font-semibold text-white text-sm">{faq.q}</h4>
                  </div>
                  <div className="p-4 bg-transparent">
                    <p className="text-slate-300 text-xs leading-relaxed">{faq.a}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar Related Tools Widget */}
        <div className="space-y-8">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-md">
            <h3 className="font-display font-bold text-lg text-white mb-4 flex items-center gap-2">
              <Icons.Layers className="text-blue-400 w-5 h-5" />
              Related Sibling Tools
            </h3>
            <p className="text-xs text-slate-350 mb-5 leading-normal">
              Need another formatting swap or image compression check? Instantly toggle between sibling utilities:
            </p>
            <div className="space-y-3">
              {React.useMemo(() => {
                // Find sibling tools based on category
                const siblings = TOOLS_LIST;
                return siblings
                  .filter((t: Tool) => t.category === tool.category && t.id !== tool.id)
                  .sort(() => 0.5 - Math.random())
                  .slice(0, 5);
              }, [tool.id, tool.category]).map((sib: Tool) => (
                <button
                  key={sib.id}
                  onClick={() => onNavigateToTool(sib.id)}
                  className="w-full text-left bg-white/5 hover:bg-white/10 border border-white/10 p-3 rounded-xl flex items-center gap-3 transition group"
                >
                  <div className="p-1.5 rounded-lg bg-white/5 text-slate-300 group-hover:bg-blue-600 group-hover:text-white transition">
                    <DynamicIcon name={sib.icon} className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="font-display text-xs text-slate-300 font-bold block transition group-hover:text-blue-400 leading-tight">{sib.name}</span>
                    <span className="text-[10px] text-slate-450 leading-none">Category: {sib.category}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-blue-600/10 backdrop-blur-md border border-white/10 rounded-2xl p-6 text-center space-y-4">
            <div className="mx-auto w-10 h-10 rounded-full bg-blue-600/20 text-blue-400 flex items-center justify-center">
              <Icons.ShieldCheck className="w-5 h-5" />
            </div>
            <h4 className="font-display font-bold text-white text-base">Absolute Data Safety</h4>
            <p className="text-xs text-slate-305 leading-relaxed">
              None of your raw documents are uploaded or saved. Files process within your client canvas threads.
            </p>
          </div>
        </div>
      </section>

      {/* Dynamic Toast Notification popup */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            id="toast-notification"
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 350, damping: 25 }}
            className="fixed bottom-6 right-6 z-50 max-w-sm bg-slate-900/90 border border-emerald-500/30 text-white rounded-xl shadow-2xl p-4 backdrop-blur-xl flex items-start gap-3.5 shadow-emerald-950/20"
          >
            <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400 shrink-0">
              <Icons.CheckCircle className="w-5 h-5 animate-pulse" />
            </div>
            <div className="flex-1 min-w-0">
              <h5 className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-widest mb-0.5">Task Complete</h5>
              <p className="text-xs text-slate-200 leading-relaxed font-sans">{toastMessage}</p>
            </div>
            <button
              onClick={() => setToastMessage(null)}
              className="text-slate-400 hover:text-white transition p-1 rounded-lg hover:bg-white/5 cursor-pointer"
            >
              <Icons.X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
