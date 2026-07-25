import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { UploadCloud, FileImage, Loader2, Users, MapPin, FileText, AlertTriangle } from 'lucide-react';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';

export function Inicio() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [technicians, setTechnicians] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "techniciansList", "current"), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.technicians) {
          setTechnicians(data.technicians);
        }
      }
    });
    return () => unsub();
  }, []);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setError(null);
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError("Por favor, selecione uma imagem primeiro.");
      return;
    }

    setIsUploading(true);
    setError(null);
    setTechnicians([]);

    const formData = new FormData();
    formData.append('image', selectedFile);

    try {
      const response = await fetch('/api/extract-technicians', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Falha ao processar a imagem");
      }

      const data = await response.json();
      if (data && data.technicians) {
        await setDoc(doc(db, "techniciansList", "current"), { technicians: data.technicians });
        setSelectedFile(null);
        setPreviewUrl(null);
      } else {
        setError("Nenhuma informação de técnico encontrada na imagem.");
      }
    } catch (err) {
      console.error(err);
      setError(err.message || "Erro ao conectar com o servidor.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="max-w-6xl mx-auto space-y-6 pb-20"
    >
      <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
          <div className="bg-red-100 p-2 rounded-lg">
            <Users className="w-6 h-6 text-red-600" />
          </div>
          Disponibilidade de Técnicos
        </h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Upload Section */}
        <div className="bg-white p-6 rounded-xl shadow-sm border-t-4 border-t-red-500 border-x border-b border-slate-200 lg:col-span-4 flex flex-col h-full">
          <h2 className="text-lg font-bold border-b pb-3 mb-4 text-slate-700 flex items-center gap-2">
            <UploadCloud className="w-5 h-5 text-red-600" /> 
            Upload de Escala
          </h2>
          
          <div className="space-y-4 flex-grow flex flex-col">
            <p className="text-sm text-slate-600">
              Faça upload de uma imagem contendo a escala ou disponibilidade dos técnicos para extrair as informações automaticamente.
            </p>
            
            <div className="mt-4 flex-grow border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 hover:bg-slate-100 transition flex flex-col items-center justify-center p-6 relative overflow-hidden group">
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                disabled={isUploading}
              />
              
              {previewUrl ? (
                <div className="w-full h-full flex flex-col items-center justify-center">
                  <div className="relative w-full max-h-48 rounded-lg overflow-hidden mb-3">
                     <img src={previewUrl} alt="Preview" className="w-full h-full object-contain" />
                  </div>
                  <span className="text-xs font-medium text-slate-500 bg-white px-2 py-1 rounded shadow-sm">
                    {selectedFile.name}
                  </span>
                </div>
              ) : (
                <div className="text-center">
                  <FileImage className="w-10 h-10 text-slate-400 mx-auto mb-2 group-hover:text-red-500 transition-colors" />
                  <p className="text-sm font-medium text-slate-600">Clique ou arraste uma imagem</p>
                  <p className="text-xs text-slate-400 mt-1">PNG, JPG, JPEG</p>
                </div>
              )}
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-100 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <p>{error}</p>
              </div>
            )}

            <button 
              onClick={handleUpload}
              disabled={!selectedFile || isUploading}
              className={`w-full py-3 px-4 rounded-xl font-bold flex justify-center items-center gap-2 transition-all shadow-sm ${
                !selectedFile || isUploading
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  : 'bg-red-600 hover:bg-red-700 text-white hover:shadow'
              }`}
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" /> Processando Imagem...
                </>
              ) : (
                <>
                  <UploadCloud className="w-5 h-5" /> Analisar Imagem
                </>
              )}
            </button>
          </div>
        </div>

        {/* Results Section */}
        <div className="bg-white p-6 rounded-xl shadow-sm border-t-4 border-t-red-500 border-x border-b border-slate-200 lg:col-span-8 flex flex-col h-full min-h-[400px]">
          <h2 className="text-lg font-bold border-b pb-3 mb-4 text-slate-700 flex items-center gap-2">
            <FileText className="w-5 h-5 text-red-500" /> 
            Técnicos Disponíveis
          </h2>
          
          <div className="flex-grow flex flex-col">
            {technicians.length > 0 ? (
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-sm text-slate-600">
                  <thead className="bg-slate-50 text-slate-700 text-xs uppercase font-semibold">
                    <tr>
                      <th className="px-4 py-3 border-b border-slate-200">Técnico</th>
                      <th className="px-4 py-3 border-b border-slate-200">Região</th>
                      <th className="px-4 py-3 border-b border-slate-200">Anotações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {technicians.map((tech, idx) => (
                      <motion.tr 
                        key={idx}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className="hover:bg-slate-50 transition-colors"
                      >
                        <td className="px-4 py-3 font-medium text-slate-800 flex items-center gap-2">
                           <div className="w-8 h-8 rounded-full bg-red-100 text-red-700 flex items-center justify-center font-bold text-xs">
                             {tech.name.substring(0,2).toUpperCase()}
                           </div>
                           {tech.name}
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md text-xs font-medium border border-slate-200">
                            <MapPin className="w-3 h-3 text-slate-500" /> {tech.region || "-"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-500">{tech.notes || "-"}</td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex-grow flex flex-col items-center justify-center text-slate-400">
                <Users className="w-16 h-16 mb-4 text-slate-200" />
                <p className="text-lg font-medium text-slate-500">Nenhum dado extraído</p>
                <p className="text-sm">Faça o upload de uma imagem com a escala para visualizar os técnicos aqui.</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </motion.div>
  );
}
