import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, File, X, Plus, FileText, Calendar, Clock } from "lucide-react";
import { toast } from "sonner";

interface FileWithPreview extends File {
  id: string;
  preview?: string;
}

interface PricingInfo {
  printPrice: number;
  totalPrice: number;
  pageDetails: {
    totalPages: number;
    bwPages: number;
    colorPages: number;
  };
}

interface OrderData {
  orderId: string;
  files: {
    name: string;
    size: number;
    type: string;
    id: string;
  }[];
  specifications: string;
  bwCount: number;
  colorCount: number;
  copies: number;
  gsm: string;
  colorOption: string;
  pricingInfo: PricingInfo | null;
  paymentProof: {
    name: string;
    size: number;
    type: string;
    id: string;
  } | null;
  contactInfo: {
    email: string;
    phone: string;
  };
  timestamp: {
    date: string;
    time: string;
    iso: string;
  };
}

const PrintOrderForm = () => {
  const [bwCount, setBwCount] = useState(0);
  const [colorCount, setColorCount] = useState(0);
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [gsm, setGsm] = useState("normal");
  const [printMode, setPrintMode] = useState("auto");
  const [colorOption, setColorOption] = useState("detect");
  const [isProcessing, setIsProcessing] = useState(false);
  const [pricingInfo, setPricingInfo] = useState<PricingInfo | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const paymentProofRef = useRef<HTMLInputElement>(null);
  const [paymentProof, setPaymentProof] = useState<FileWithPreview | null>(null);
  const [contactInfo, setContactInfo] = useState({
    email: "",
    phone: ""
  });
  const [copies, setCopies] = useState(1);
  const [specifications, setSpecifications] = useState("");
  const [orderSubmitted, setOrderSubmitted] = useState(false);
  const [submittedOrderId, setSubmittedOrderId] = useState<string | null>(null);

  // Price per page (in INR)
  const prices = {
    bw: {
      "normal": 1,
      "80": 2,
      "90": 2.5,
      "100": 3
    },
    color: {
      "normal": 5,
      "80": 6,
      "90": 6.5,
      "100": 7
    }
  };

  // Add validation state
  const [formErrors, setFormErrors] = useState<string[]>([]);

  const generateSimpleId = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files) return;
    
    try {
      const newFiles = Array.from(event.target.files).map(file => ({
        ...file,
        id: generateSimpleId(),
        preview: URL.createObjectURL(file)
      }) as FileWithPreview);
      
      setFiles(prev => [...prev, ...newFiles]);
      
      event.target.value = "";
      toast.success(`${newFiles.length} file(s) uploaded successfully`);
    } catch (err) {
      console.error("Error uploading file:", err);
      toast.error("Failed to upload file. Please try again.");
      if (event.target.value) event.target.value = "";
    }
  };

  const handleRemoveFile = (id: string) => {
    setFiles(files.filter(file => file.id !== id));
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!e.dataTransfer.files) return;
    
    try {
      const newFiles = Array.from(e.dataTransfer.files).map(file => ({
        ...file,
        id: generateSimpleId(),
        preview: URL.createObjectURL(file)
      }) as FileWithPreview);
      
      setFiles(prev => [...prev, ...newFiles]);
      
      toast.success(`${newFiles.length} file(s) uploaded successfully`);
    } catch (err) {
      console.error("Error in file drop:", err);
      toast.error("Failed to process dropped files. Please try again.");
    }
  };

  // Calculate price based on user inputs
  const calculatePrice = useCallback((
    currentFiles: FileWithPreview[], 
    colorMode: string,
    gsmType: string,
    copyCount: number
  ) => {
    if (currentFiles.length === 0) {
      setPricingInfo(null);
      return;
    }
    
    // Only use manual counts
    const totalPages = bwCount + colorCount;
    const totalColorPages = colorCount;
    const bwPages = bwCount;
    
    // Calculate paper/printing prices
    const bwPrice = bwPages * prices.bw[gsmType as keyof typeof prices.bw] * copyCount;
    const colorPrice = totalColorPages * prices.color[gsmType as keyof typeof prices.color] * copyCount;
    const printPrice = bwPrice + colorPrice;
    
    setPricingInfo({
      printPrice,
      totalPrice: printPrice,
      pageDetails: {
        totalPages: totalPages * copyCount,
        bwPages: bwPages * copyCount,
        colorPages: totalColorPages * copyCount
      }
    });
  }, [bwCount, colorCount, prices]);

  // Recalculate whenever inputs change
  useEffect(() => {
    calculatePrice(files, colorOption, gsm, copies);
  }, [files, bwCount, colorCount, gsm, copies, colorOption, calculatePrice]);

  // Cleanup file preview URLs when component unmounts
  useEffect(() => {
    return () => {
      files.forEach(file => {
        if (file.preview) {
          URL.revokeObjectURL(file.preview);
        }
      });
    };
  }, [files]);

  const handleGsmChange = (value: string) => {
    setGsm(value);
  };

  const handleColorOptionChange = (value: string) => {
    setColorOption(value);
  };

  const handlePaymentProofUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0) return;
    
    try {
      const file = event.target.files[0];
      
      const paymentFile = {
        ...file,
        id: generateSimpleId(),
        preview: URL.createObjectURL(file),
      } as FileWithPreview;
      
      setPaymentProof(paymentFile);
      toast.success("Payment proof uploaded successfully");
      
      // Clear the input value
      if (event.target.value) event.target.value = "";
    } catch (err) {
      console.error("Error in payment proof upload:", err);
      toast.error("Failed to upload payment proof. Please try again.");
    }
  }, []);

  const handleRemovePaymentProof = () => {
    if (paymentProof && paymentProof.preview) {
      URL.revokeObjectURL(paymentProof.preview);
    }
    setPaymentProof(null);
  };

  const handleContactInfoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setContactInfo(prev => ({ ...prev, [name]: value }));
  };

  const handleSpecificationsChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setSpecifications(e.target.value);
  };

  // Add validation function to check if all required fields are filled
  const validateForm = useCallback(() => {
    const errors: string[] = [];
    
    if (files.length === 0) {
      errors.push("Please upload at least one file");
    }
    
    if (bwCount === 0 && colorCount === 0) {
      errors.push("Please specify at least one page to print");
    }
    
    if (!paymentProof) {
      errors.push("Please upload payment proof");
    }
    
    if (!contactInfo.phone && !contactInfo.email) {
      errors.push("Please provide either email or phone number for contact");
    }
    
    setFormErrors(errors);
    return errors.length === 0;
  }, [files.length, bwCount, colorCount, paymentProof, contactInfo.phone, contactInfo.email]);
  
  // Update form errors when key inputs change
  useEffect(() => {
    validateForm();
  }, [files, bwCount, colorCount, paymentProof, contactInfo, validateForm]);

  const handleSubmitOrder = () => {
    if (!validateForm()) {
      // Show toast for each error
      formErrors.forEach(error => {
        toast.error(error);
      });
      return;
    }
    
    setIsProcessing(true);
    
    try {
      // Generate a unique order ID with timestamp
      const orderId = `PO-${Date.now().toString().slice(-8)}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
      
      // Get current date and time
      const now = new Date();
      const dateStr = now.toLocaleDateString('en-IN', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric' 
      });
      const timeStr = now.toLocaleTimeString('en-IN', { 
        hour: '2-digit', 
        minute: '2-digit',
        second: '2-digit',
        hour12: true 
      });
      
      // Prepare order data
      const orderData: OrderData = {
        orderId,
        files: files.map(file => ({
          name: file.name,
          size: file.size,
          type: file.type,
          id: file.id
        })),
        specifications,
        bwCount,
        colorCount,
        copies,
        gsm,
        colorOption,
        pricingInfo,
        paymentProof: paymentProof ? {
          name: paymentProof.name,
          size: paymentProof.size,
          type: paymentProof.type,
          id: paymentProof.id
        } : null,
        contactInfo,
        timestamp: {
          date: dateStr,
          time: timeStr,
          iso: now.toISOString()
        }
      };
      
      // Store the order data in localStorage for persistence
      // In a real application, you would send this to a server
      const existingOrders = JSON.parse(localStorage.getItem('printOrders') || '[]');
      localStorage.setItem('printOrders', JSON.stringify([...existingOrders, orderData]));
      
      // Set the submitted order ID
      setSubmittedOrderId(orderId);
      setOrderSubmitted(true);
      
      toast.success(`Your print order #${orderId} has been submitted! We'll contact you shortly.`);
      
      // Reset the form
      setFiles([]);
      setPricingInfo(null);
      setPaymentProof(null);
      setContactInfo({ email: "", phone: "" });
      setBwCount(0);
      setColorCount(0);
      setSpecifications("");
    } catch (err) {
      console.error("Error submitting order:", err);
      toast.error("Failed to submit order. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="py-12 bg-white">
      <div className="container px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="font-serif text-3xl md:text-4xl font-bold text-[#D4AF37] mb-4">Print Order Service</h2>
          <p className="text-gray-600 text-lg">
            Professional printing solutions by Deep Computers
          </p>
        </div>
        
        {orderSubmitted && submittedOrderId ? (
          <div className="max-w-md mx-auto bg-green-50 p-6 rounded-lg border border-green-200 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-xl font-medium text-green-800 mb-2">Order Submitted Successfully!</h3>
            <p className="text-green-700 mb-4">Your order number is: <span className="font-bold">{submittedOrderId}</span></p>
            <p className="text-sm text-green-600 mb-6">We have received your order and will contact you shortly.</p>
            <Button 
              onClick={() => setOrderSubmitted(false)} 
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              Place Another Order
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-serif text-xl font-semibold mb-6 text-[#D4AF37]">Upload Your Files</h3>
                  
                  <div 
                    className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center mb-6 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                  >
                    <Upload className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                    <h4 className="text-lg font-medium mb-2">Drag and drop your files here</h4>
                    <p className="text-sm text-gray-500 mb-4">or click to browse</p>
                    <p className="text-xs text-gray-400">Supported formats: PDF, DOC, DOCX</p>
                    
                    <input
                      type="file"
                      ref={fileInputRef}
                      className="hidden"
                      onChange={handleFileUpload}
                      accept=".pdf,.doc,.docx"
                      multiple
                    />
                  </div>
                  
                  {files.length > 0 && (
                    <div className="mb-6">
                      <h4 className="font-medium mb-3">Uploaded Files ({files.length})</h4>
                      <div className="space-y-3">
                        {files.map((file) => (
                          <div key={file.id} className="flex items-center justify-between bg-gray-50 p-3 rounded-md">
                            <div className="flex items-center">
                              <FileText className="h-5 w-5 text-primary mr-3" />
                              <p className="text-sm font-medium truncate" style={{ maxWidth: '200px' }}>
                                {file.name}
                              </p>
                            </div>
                            <button 
                              onClick={() => handleRemoveFile(file.id)} 
                              className="text-gray-400 hover:text-red-500"
                            >
                              <X className="h-5 w-5" />
                            </button>
                          </div>
                        ))}
                      </div>
                      <Button 
                        onClick={() => fileInputRef.current?.click()} 
                        variant="outline" 
                        size="sm" 
                        className="mt-3"
                      >
                        <Plus className="h-4 w-4 mr-2" /> Add More Files
                      </Button>
                    </div>
                  )}
                  
                  <div className="mb-6">
                    <h4 className="font-medium mb-3">Page Count</h4>
                    <p className="text-sm text-gray-500 mb-3">
                      Enter the number of pages to print. You must enter these values manually.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="bw-pages">Black & White Pages</Label>
                        <Input 
                          id="bw-pages" 
                          type="number" 
                          min={0} 
                          value={bwCount} 
                          onChange={e => {
                            setBwCount(Number(e.target.value));
                          }} 
                        />
                      </div>
                      <div>
                        <Label htmlFor="color-pages">Color Pages</Label>
                        <Input 
                          id="color-pages" 
                          type="number" 
                          min={0} 
                          value={colorCount} 
                          onChange={e => {
                            setColorCount(Number(e.target.value));
                          }} 
                        />
                      </div>
                    </div>
                  </div>
                  
                  {/* Specifications Text Area */}
                  <div className="mb-6">
                    <Label htmlFor="specifications" className="font-medium mb-2 block">Order Specifications</Label>
                    <p className="text-sm text-gray-500 mb-3">
                      Please provide any specific instructions for your print job.
                    </p>
                    <textarea
                      id="specifications"
                      className="w-full min-h-[100px] p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#D4AF37]"
                      placeholder="Example: Pages 14-15, 46, 57 are colored and rest are black and white. Double-sided printing. Special instructions for binding, etc."
                      value={specifications}
                      onChange={handleSpecificationsChange}
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                      <Label htmlFor="paper-gsm" className="mb-2 block">Paper Type</Label>
                      <Select value={gsm} onValueChange={handleGsmChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select paper type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="normal">Normal Paper</SelectItem>
                          <SelectItem value="80">Bond Paper 80 GSM</SelectItem>
                          <SelectItem value="90">Bond Paper 90 GSM</SelectItem>
                          <SelectItem value="100">Bond Paper 100 GSM</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-gray-500 mt-1">
                        Select the paper type for your print
                      </p>
                    </div>
                    
                    <div>
                      <Label className="mb-2 block">Color Options</Label>
                      <RadioGroup value={colorOption} onValueChange={handleColorOptionChange}>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="detect" id="color-auto" />
                          <Label htmlFor="color-auto">Auto Detect (Smart)</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="all-bw" id="color-bw" />
                          <Label htmlFor="color-bw">All Black & White</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="all-color" id="color-all" />
                          <Label htmlFor="color-all">All Color</Label>
                        </div>
                      </RadioGroup>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                      <Label htmlFor="copies" className="mb-2 block">Number of Copies</Label>
                      <Input
                        id="copies"
                        type="number"
                        min="1"
                        value={copies}
                        onChange={(e) => setCopies(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-full"
                      />
                    </div>
                    
                    <div>
                      <Label className="mb-2 block">Current Date & Time</Label>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="flex items-center bg-gray-50 p-2 rounded-md">
                          <Calendar className="h-4 w-4 text-gray-500 mr-2" />
                          <span className="text-sm text-gray-700">
                            {new Date().toLocaleDateString('en-IN', { 
                              day: '2-digit', 
                              month: '2-digit', 
                              year: 'numeric' 
                            })}
                          </span>
                        </div>
                        <div className="flex items-center bg-gray-50 p-2 rounded-md">
                          <Clock className="h-4 w-4 text-gray-500 mr-2" />
                          <span className="text-sm text-gray-700">
                            {new Date().toLocaleTimeString('en-IN', { 
                              hour: '2-digit', 
                              minute: '2-digit',
                              hour12: true 
                            })}
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        This information will be captured with your order
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <div className="lg:col-span-1">
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-serif text-xl font-semibold mb-6 text-[#D4AF37]">Order Summary</h3>
                  
                  {!pricingInfo ? (
                    <div className="text-center py-8">
                      <div className="print-animation-container mx-auto mb-4 relative w-32 h-32">
                        <div className="print-machine absolute w-full h-full bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" className="w-20 h-20 text-gray-500">
                            <rect x="20" y="55" width="60" height="30" rx="2" className="fill-[#D4AF37]" />
                            <rect x="25" y="60" width="50" height="20" rx="1" className="fill-white" />
                            <rect x="35" y="40" width="30" height="15" rx="1" className="fill-gray-300" />
                            <rect x="30" y="15" width="40" height="5" rx="1" className="fill-gray-400" />
                          </svg>
                        </div>
                        <div className="paper-sheet absolute w-full h-5 bg-white border border-gray-200 top-1/3 left-0 print-paper-animation" />
                        <div className="print-person absolute right-0 bottom-0 w-10 h-16">
                          <div className="person-head w-6 h-6 rounded-full bg-[#F9D5A7] mx-auto" />
                          <div className="person-body w-8 h-8 bg-[#3F88C5] mt-1 mx-auto rounded-t-md person-move-animation" />
                        </div>
                      </div>
                      <style jsx>{`
                        @keyframes printPaper {
                          0% { transform: translateY(-100%); opacity: 0; }
                          20% { transform: translateY(0%); opacity: 1; }
                          80% { transform: translateY(0%); opacity: 1; }
                          100% { transform: translateY(100%); opacity: 0; }
                        }
                        @keyframes personMove {
                          0% { transform: translateX(0) rotate(0deg); }
                          25% { transform: translateX(-5px) rotate(-5deg); }
                          75% { transform: translateX(5px) rotate(5deg); }
                          100% { transform: translateX(0) rotate(0deg); }
                        }
                        .print-paper-animation {
                          animation: printPaper 3s infinite;
                        }
                        .person-move-animation {
                          animation: personMove 2s infinite;
                        }
                      `}</style>
                      <p className="text-gray-500">Upload files and enter page counts to see pricing</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="bg-gray-50 p-4 rounded-md">
                        <h4 className="font-medium mb-2">Document Details</h4>
                        <ul className="space-y-1 text-sm">
                          <li className="flex justify-between">
                            <span>Total Files:</span>
                            <span>{files.length}</span>
                          </li>
                          <li className="flex justify-between">
                            <span>Total Pages:</span>
                            <span>{pricingInfo.pageDetails.totalPages}</span>
                          </li>
                          <li className="flex justify-between">
                            <span>Black & White Pages:</span>
                            <span>{pricingInfo.pageDetails.bwPages}</span>
                          </li>
                          <li className="flex justify-between">
                            <span>Color Pages:</span>
                            <span>{pricingInfo.pageDetails.colorPages}</span>
                          </li>
                          <li className="flex justify-between">
                            <span>Paper Quality:</span>
                            <span>{
                              gsm === "normal" ? "Normal Paper" : 
                              gsm === "80" ? "Bond Paper 80 GSM" : 
                              gsm === "90" ? "Bond Paper 90 GSM" : 
                              "Bond Paper 100 GSM"
                            }</span>
                          </li>
                          <li className="flex justify-between">
                            <span>Number of Copies:</span>
                            <span>{copies}</span>
                          </li>
                        </ul>
                        {specifications && (
                          <div className="mt-3 pt-3 border-t border-gray-200">
                            <h5 className="font-medium text-sm mb-1">Special Instructions:</h5>
                            <p className="text-xs text-gray-600 whitespace-pre-line">{specifications}</p>
                          </div>
                        )}
                      </div>
                      
                      <div className="border-t pt-4">
                        <h4 className="font-medium mb-2">Pricing Breakdown</h4>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span>B&W Pages ({pricingInfo.pageDetails.bwPages} pages):</span>
                            <span>₹{(pricingInfo.pageDetails.bwPages / copies) * prices.bw[gsm as keyof typeof prices.bw] * copies}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Color Pages ({pricingInfo.pageDetails.colorPages} pages):</span>
                            <span>₹{(pricingInfo.pageDetails.colorPages / copies) * prices.color[gsm as keyof typeof prices.color] * copies}</span>
                          </div>
                          <div className="flex justify-between font-bold text-lg pt-2 border-t">
                            <span>Total:</span>
                            <span>₹{pricingInfo.totalPrice}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="border-t pt-4">
                        <h4 className="font-medium mb-2">Payment Instructions</h4>
                        <div className="bg-white p-3 border rounded-md mb-3">
                          <p className="text-sm mb-2 text-center font-medium">Scan to pay ₹{pricingInfo.totalPrice}</p>
                          <div className="flex justify-center">
                            <img 
                              src="/images/payment-qr.jpg" 
                              alt="PhonePe Payment QR" 
                              className="w-full max-w-[300px] mx-auto"
                            />
                          </div>
                        </div>
                        <div className="text-xs space-y-1 text-gray-500 mb-4">
                          <p>1. After payment, please take a screenshot of the payment confirmation.</p>
                          <p>2. Include your name and contact number with your order.</p>
                          <p>3. Once verified, your prints will be ready for pickup within 1 hour.</p>
                          <p>4. We'll notify you when your order is ready for pickup.</p>
                        </div>
                        
                        {/* Payment Proof Upload Section */}
                        <div className="border-t pt-4 mb-4">
                          <h4 className="font-medium mb-2">Upload Payment Proof</h4>
                          {!paymentProof ? (
                            <div
                              className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:bg-gray-50 transition-colors"
                              onClick={() => paymentProofRef.current?.click()}
                            >
                              <Upload className="h-6 w-6 mx-auto text-gray-400 mb-2" />
                              <p className="text-sm text-gray-600">Click to upload payment screenshot</p>
                              <p className="text-xs text-gray-400 mt-1">Supported: JPG, PNG, PDF</p>
                              <input
                                type="file"
                                ref={paymentProofRef}
                                className="hidden"
                                onChange={handlePaymentProofUpload}
                                accept=".jpg,.jpeg,.png,.pdf"
                              />
                            </div>
                          ) : (
                            <div className="bg-gray-50 p-3 rounded-md">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                  <FileText className="h-5 w-5 text-primary mr-3" />
                                  <div>
                                    <p className="text-sm font-medium truncate" style={{ maxWidth: '200px' }}>
                                      {paymentProof.name}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      {Math.round(paymentProof.size / 1024)} KB
                                    </p>
                                  </div>
                                </div>
                                <button 
                                  onClick={handleRemovePaymentProof} 
                                  className="text-gray-400 hover:text-red-500"
                                >
                                  <X className="h-5 w-5" />
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                        
                        {/* Contact Information */}
                        <div className="border-t pt-4 mb-4">
                          <h4 className="font-medium mb-2">Contact Information</h4>
                          <div className="space-y-3">
                            <div>
                              <Label htmlFor="email" className="text-sm mb-1 block">Email</Label>
                              <Input
                                id="email"
                                name="email"
                                type="email"
                                placeholder="your@email.com"
                                value={contactInfo.email}
                                onChange={handleContactInfoChange}
                              />
                            </div>
                            <div>
                              <Label htmlFor="phone" className="text-sm mb-1 block">Phone Number</Label>
                              <Input
                                id="phone"
                                name="phone"
                                type="tel"
                                placeholder="Your mobile number"
                                value={contactInfo.phone}
                                onChange={handleContactInfoChange}
                              />
                              <p className="text-xs text-gray-500 mt-1">
                                Please provide at least one contact method
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <Button 
                        onClick={handleSubmitOrder} 
                        className={`w-full bg-[#D4AF37] hover:bg-[#B8860B] text-black font-semibold ${
                          formErrors.length > 0 ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                        disabled={formErrors.length > 0 || isProcessing}
                      >
                        {isProcessing ? 'Processing...' : 'Submit Print Order'}
                      </Button>
                      
                      {formErrors.length > 0 && (
                        <div className="mt-2 text-xs text-red-500">
                          <p>Please fix the following issues:</p>
                          <ul className="list-disc list-inside mt-1">
                            {formErrors.map((error, index) => (
                              <li key={index}>{error}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      <p className="text-xs text-gray-500 text-center mt-2">
                        You'll be contacted to confirm the order details
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}
        
        {/* Admin Access Info - Only visible in development */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-12 p-4 border border-gray-200 rounded-md bg-gray-50">
            <h3 className="text-md font-medium mb-2">Order Data Storage Information (Development Only)</h3>
            <p className="text-sm text-gray-600 mb-2">
              All order data is currently stored in the browser's localStorage under the key 'printOrders'.
              In production, this would be sent to a backend server and stored in a database.
            </p>
            <div className="text-xs text-gray-500">
              <p>To access stored orders:</p>
              <pre className="bg-gray-100 p-2 rounded mt-1 overflow-x-auto">
                const orders = JSON.parse(localStorage.getItem('printOrders') || '[]')
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PrintOrderForm; 