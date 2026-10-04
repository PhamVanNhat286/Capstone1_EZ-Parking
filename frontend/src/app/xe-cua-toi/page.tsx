"use client";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useStore, Vehicle } from "@/store";
import { ChevronLeft, Plus, Trash2, Edit2, CarFront, CheckCircle2, AlertTriangle, GripVertical } from "lucide-react";
import { clsx } from "clsx";
import BottomSheet from "@/components/ui/BottomSheet";
import { Reorder } from "framer-motion";

export default function VehiclesPage() {
  const router = useRouter();
  const { vehicles, addVehicle, updateVehicle, deleteVehicle, setDefaultVehicle, reorderVehicles, addToast } = useStore();
  
  const [sheet, setSheet] = useState<"none" | "add" | "edit" | "delete">("none");
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);

  // Form states
  const [formName, setFormName] = useState("");
  const [formPlate, setFormPlate] = useState("");
  const [formType, setFormType] = useState<"Sedan" | "SUV" | "EV">("Sedan");
  const [formDefault, setFormDefault] = useState(false);
  const [plateError, setPlateError] = useState("");

  const resetForm = () => {
    setFormName("");
    setFormPlate("");
    setFormType("Sedan");
    setFormDefault(false);
    setPlateError("");
  };

  const handleEditClick = (v: Vehicle) => {
    setSelectedVehicle(v);
    setFormName(v.name);
    setFormPlate(v.plate);
    setFormType(v.type);
    setFormDefault(!!v.isPrimary);
    setPlateError("");
    setSheet("edit");
  };

  const handleDeleteClick = (v: Vehicle) => {
    if (vehicles.length <= 1) {
      addToast("Không thể xóa xe cuối cùng", "error");
      return;
    }
    setSelectedVehicle(v);
    setSheet("delete");
  };

  const validatePlate = (p: string) => {
    // Basic VN Plate: 43A-123.45 or 43A-12345 or 43A1-123.45
    const regex = /^[0-9]{2}[A-Z][0-9]?-[0-9]{3,4}(\.[0-9]{2})?$/;
    return regex.test(p.toUpperCase());
  };

  const handleSave = () => {
    if (!formName) {
      addToast("Vui lòng nhập tên xe", "error"); return;
    }
    const upPlate = formPlate.toUpperCase();
    if (!validatePlate(upPlate)) {
      setPlateError("Biển số không hợp lệ (VD: 43A-123.45)"); return;
    }

    if (sheet === "add") {
      const newV: Vehicle = {
        id: `v${Date.now()}`,
        name: formName,
        plate: upPlate,
        type: formType,
        isPrimary: formDefault || vehicles.length === 0
      };
      addVehicle(newV);
      if (formDefault) setDefaultVehicle(newV.id);
      addToast("Đã thêm xe mới", "success");
    } else if (sheet === "edit" && selectedVehicle) {
      updateVehicle(selectedVehicle.id, {
        name: formName,
        plate: upPlate,
        type: formType
      });
      if (formDefault) setDefaultVehicle(selectedVehicle.id);
      addToast("Đã cập nhật xe", "success");
    }
    setSheet("none");
  };

  const confirmDelete = () => {
    if (selectedVehicle) {
      deleteVehicle(selectedVehicle.id);
      addToast("Đã xóa xe", "success");
      // If was default, make first one default
      if (selectedVehicle.isPrimary && vehicles.length > 1) {
        const remaining = vehicles.filter(v => v.id !== selectedVehicle.id);
        setDefaultVehicle(remaining[0].id);
      }
    }
    setSheet("none");
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col pb-24 transition-colors">
      <div className="bg-white dark:bg-slate-800 px-4 py-3 flex items-center justify-between border-b border-slate-100 dark:border-slate-700 sticky top-0 z-20">
        <button onClick={() => router.back()} className="w-10 h-10 flex items-center justify-center -ml-2 text-slate-600 dark:text-slate-300 active:scale-95">
          <ChevronLeft size={24} />
        </button>
        <div className="text-center flex-1">
          <h1 className="text-[17px] font-bold text-slate-900 dark:text-white">Xe của tôi</h1>
        </div>
        <div className="w-10" />
      </div>

      <div className="px-4 py-6">
        <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3 px-2">Kéo thả để sắp xếp</p>
        
        <Reorder.Group axis="y" values={vehicles} onReorder={reorderVehicles} className="space-y-3">
          {vehicles.map((v) => (
            <Reorder.Item key={v.id} value={v} className="bg-white dark:bg-slate-800 p-4 rounded-[20px] shadow-sm border border-slate-100 dark:border-slate-700 flex items-center gap-4 relative touch-pan-y">
              <div className="text-slate-300 dark:text-slate-600 cursor-grab active:cursor-grabbing">
                <GripVertical size={20} />
              </div>
              
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm">{v.name}</h3>
                  {v.isPrimary && (
                    <span className="bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 text-[9px] font-black uppercase px-2 py-0.5 rounded">Mặc định</span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded">{v.plate}</span>
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">{v.type}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button onClick={() => handleEditClick(v)} className="w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-700 flex items-center justify-center text-[#2B4BD1] dark:text-blue-400 active:scale-95">
                  <Edit2 size={14} />
                </button>
                <button onClick={() => handleDeleteClick(v)} className="w-8 h-8 rounded-full bg-red-50 dark:bg-red-500/10 flex items-center justify-center text-red-500 active:scale-95">
                  <Trash2 size={14} />
                </button>
              </div>
            </Reorder.Item>
          ))}
        </Reorder.Group>

        <button 
          onClick={() => { resetForm(); setSheet("add"); }}
          className="w-full mt-6 bg-slate-100 dark:bg-slate-800 border border-dashed border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 font-bold py-4 rounded-[20px] active:scale-95 flex items-center justify-center gap-2"
        >
          <Plus size={20} /> Thêm xe mới
        </button>
      </div>

      {/* Form Sheet */}
      <BottomSheet isOpen={sheet === "add" || sheet === "edit"} onClose={() => setSheet("none")} title={sheet === "add" ? "Thêm xe mới" : "Chỉnh sửa xe"}>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 block">Tên xe</label>
            <input 
              type="text" 
              value={formName}
              onChange={e => setFormName(e.target.value)}
              placeholder="VD: Xe của Nhat"
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[12px] p-4 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-[#2B4BD1]"
            />
          </div>
          
          <div>
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 block">Biển số xe</label>
            <input 
              type="text" 
              value={formPlate}
              onChange={e => { setFormPlate(e.target.value); setPlateError(""); }}
              placeholder="VD: 43A-123.45"
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[12px] p-4 text-sm font-bold font-mono text-slate-900 dark:text-white focus:outline-none focus:border-[#2B4BD1] uppercase"
            />
            {plateError && <p className="text-xs font-bold text-red-500 mt-1">{plateError}</p>}
          </div>

          <div>
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 block">Loại xe</label>
            <div className="flex gap-2">
              {(["Sedan", "SUV", "EV"] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setFormType(t)}
                  className={clsx("flex-1 py-3 rounded-[12px] font-bold text-xs transition-colors",
                    formType === t ? "bg-[#2B4BD1] text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <button 
            onClick={() => setFormDefault(!formDefault)}
            className="w-full flex items-center justify-between py-2"
          >
            <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Đặt làm xe mặc định</span>
            <div className={clsx("w-12 h-6 rounded-full transition-colors relative flex items-center", formDefault ? "bg-[#2B4BD1]" : "bg-slate-200 dark:bg-slate-600")}>
              <div className={clsx("w-5 h-5 bg-white rounded-full shadow-sm transition-transform absolute", formDefault ? "translate-x-[26px]" : "translate-x-[2px]")} />
            </div>
          </button>

          <button onClick={handleSave} className="w-full bg-[#2B4BD1] text-white font-bold py-4 rounded-[16px] active:scale-95 shadow-lg shadow-[#2B4BD1]/30 mt-2">
            Lưu xe
          </button>
        </div>
      </BottomSheet>

      {/* Delete Sheet */}
      <BottomSheet isOpen={sheet === "delete"} onClose={() => setSheet("none")} title="Xóa xe này?">
        <div className="flex items-start gap-3 bg-red-50 dark:bg-red-500/10 text-red-800 dark:text-red-400 p-4 rounded-[16px] mb-6 border border-red-100 dark:border-red-900/30">
          <AlertTriangle size={24} className="shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-sm mb-1">Cảnh báo</h4>
            <p className="text-xs font-medium">Bạn có chắc chắn muốn xóa xe {selectedVehicle?.name} ({selectedVehicle?.plate})? Hành động này không thể hoàn tác.</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setSheet("none")} className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold py-4 rounded-[16px] active:scale-95">Không</button>
          <button onClick={confirmDelete} className="flex-1 bg-red-500 text-white font-bold py-4 rounded-[16px] active:scale-95">Xóa xe</button>
        </div>
      </BottomSheet>
    </div>
  );
}
