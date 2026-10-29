"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useStore, Vehicle } from "@/store";
import { ChevronLeft, Plus, Trash2, Edit2, CarFront, AlertTriangle, GripVertical } from "lucide-react";
import { clsx } from "clsx";
import BottomSheet from "@/components/ui/BottomSheet";
import { Reorder } from "framer-motion";
import { getVehiclesApi, addVehicleApi, updateVehicleApi, deleteVehicleApi } from "@/lib/api";

export default function VehiclesPage() {
  const router = useRouter();
  const { user, vehicles, setVehicles, addVehicle, updateVehicle, deleteVehicle, reorderVehicles, addToast } = useStore();
  
  const [sheet, setSheet] = useState<"none" | "add" | "edit" | "delete">("none");
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);

  const [formName, setFormName] = useState("");
  const [formPlate, setFormPlate] = useState("");
  const [formType, setFormType] = useState<"Sedan" | "SUV" | "EV">("Sedan");
  const [formEvBodyType, setFormEvBodyType] = useState<"Sedan" | "SUV">("SUV");
  const [plateError, setPlateError] = useState("");

  // Sync real vehicles from backend on mount
  useEffect(() => {
    const token = user?.token || (typeof window !== "undefined" ? localStorage.getItem("ezspace_token") : null);
    if (token) {
      getVehiclesApi(token)
        .then((res) => {
          if (res.success && Array.isArray(res.data)) {
            setVehicles(
              res.data.map((v: any) => ({
                id: String(v.id),
                name: v.vehicle_name || v.license_plate,
                plate: v.license_plate,
                type: v.vehicle_type === "EV" ? "EV" : v.vehicle_type === "SUV" ? "SUV" : "Sedan",
              }))
            );
          }
        })
        .catch(() => {});
    }
  }, []);

  const resetForm = () => {
    setFormName("");
    setFormPlate("");
    setFormType("Sedan");
    setFormEvBodyType("SUV");
    setPlateError("");
  };

  const handleEditClick = (v: Vehicle) => {
    setSelectedVehicle(v);
    setFormName(v.name);
    setFormPlate(v.plate);
    setFormType(v.type);
    setFormEvBodyType(v.evBodyType || "SUV");
    setPlateError("");
    setSheet("edit");
  };

  const handleDeleteClick = (v: Vehicle) => {
    setSelectedVehicle(v);
    setSheet("delete");
  };

  const validatePlate = (p: string) => {
    // Basic VN Plate: 43A-123.45 or 43A-12345 or 43A1-123.45
    const regex = /^[0-9]{2}[A-Z][0-9]?-[0-9]{3,4}(\.[0-9]{2})?$/;
    return regex.test(p.toUpperCase());
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      addToast("Vui lòng nhập tên xe", "error");
      return;
    }
    const upPlate = formPlate.trim().toUpperCase();
    if (!validatePlate(upPlate)) {
      setPlateError("Biển số không hợp lệ (VD: 43A-123.45)");
      return;
    }

    const token = user?.token || (typeof window !== "undefined" ? localStorage.getItem("ezspace_token") : null);

    if (sheet === "add") {
      let createdId = `v${Date.now()}`;
      if (token) {
        try {
          const res = await addVehicleApi(token, {
            license_plate: upPlate,
            vehicle_name: formName.trim(),
            vehicle_type: formType,
          });
          if (res.success && res.data) {
            createdId = String(res.data.id);
          } else if (!res.success) {
            addToast(res.message || "Không thể thêm xe", "error");
            return;
          }
        } catch (err) {
          console.warn("Lỗi lưu xe backend:", err);
        }
      }

      const newV: Vehicle = {
        id: createdId,
        name: formName.trim(),
        plate: upPlate,
        type: formType,
        evBodyType: formType === "EV" ? formEvBodyType : undefined,
      };
      addVehicle(newV);
      addToast("Đã thêm xe mới thành công", "success");
    } else if (sheet === "edit" && selectedVehicle) {
      if (token) {
        try {
          await updateVehicleApi(token, selectedVehicle.id, {
            vehicle_name: formName.trim(),
            license_plate: upPlate,
            vehicle_type: formType,
          });
        } catch (err) {
          console.warn("Lỗi sửa xe backend:", err);
        }
      }

      updateVehicle(selectedVehicle.id, {
        name: formName.trim(),
        plate: upPlate,
        type: formType,
        evBodyType: formType === "EV" ? formEvBodyType : undefined,
      });
      addToast("Đã cập nhật xe", "success");
    }
    setSheet("none");
  };

  const confirmDelete = async () => {
    if (selectedVehicle) {
      const token = user?.token || (typeof window !== "undefined" ? localStorage.getItem("ezspace_token") : null);
      if (token) {
        try {
          await deleteVehicleApi(token, selectedVehicle.id);
        } catch (err) {
          console.warn("Lỗi xóa xe backend:", err);
        }
      }
      deleteVehicle(selectedVehicle.id);
      addToast("Đã xóa xe thành công", "success");
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
        {vehicles.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 p-8 rounded-[24px] text-center border border-dashed border-slate-200 dark:border-slate-700 shadow-sm">
            <CarFront size={48} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
            <h3 className="font-bold text-slate-800 dark:text-white text-base">Chưa có phương tiện nào</h3>
            <p className="text-xs text-slate-400 mt-1 mb-6">Thêm phương tiện để dễ dàng chọn xe khi đặt chỗ</p>
            <button
              onClick={() => { resetForm(); setSheet("add"); }}
              className="inline-flex items-center gap-2 px-5 py-3 bg-[#2B4BD1] text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 active:scale-95 transition-all"
            >
              <Plus size={16} /> Thêm xe mới
            </button>
          </div>
        ) : (
          <>
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
                      <span className="bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300 text-[10px] font-bold uppercase px-2 py-0.5 rounded">
                        {v.type}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold tracking-wider text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded">{v.plate}</span>
                      <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">
                        {v.type === "EV" ? `EV (${v.evBodyType || "SUV"})` : v.type}
                      </span>
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
          </>
        )}
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
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[12px] p-4 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-[#2B4BD1] uppercase tracking-wider"
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
                  {t === "EV" ? "⚡ Xe điện (EV)" : t}
                </button>
              ))}
            </div>
          </div>

          {formType === "EV" && (
            <div className="bg-blue-50/70 dark:bg-blue-950/30 p-3 rounded-[14px] border border-blue-100 dark:border-blue-900/40">
              <label className="text-xs font-bold text-blue-900 dark:text-blue-300 mb-1.5 block">
                Kiểu dáng xe điện (để xác định kích thước ô đỗ thông thường)
              </label>
              <div className="flex gap-2">
                {(["Sedan", "SUV"] as const).map(bt => (
                  <button
                    type="button"
                    key={bt}
                    onClick={() => setFormEvBodyType(bt)}
                    className={clsx("flex-1 py-2 rounded-[10px] font-bold text-xs transition-colors border",
                      formEvBodyType === bt 
                        ? "bg-[#2B4BD1] text-white border-[#2B4BD1]" 
                        : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                    )}
                  >
                    Dáng {bt} {bt === "Sedan" ? "(VD: Model 3)" : "(VD: VF8, e34)"}
                  </button>
                ))}
              </div>
            </div>
          )}

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
