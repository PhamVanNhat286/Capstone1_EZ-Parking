"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Pencil,
  AlertTriangle,
  X,
  CarFront,
  Zap,
} from "lucide-react";
import { clsx } from "clsx";
import { useStore, Vehicle } from "@/store";
import { getVehiclesApi, addVehicleApi, updateVehicleApi, deleteVehicleApi } from "@/lib/api";
import { Sedan4SeatsIcon, Suv7SeatsIcon, EvCarIcon } from "@/components/ui/VehicleIcons";

export default function MyVehiclesPage() {
  const router = useRouter();
  const { user, vehicles, setVehicles, addVehicle, updateVehicle, deleteVehicle, addToast } = useStore();

  const [sheet, setSheet] = useState<"none" | "add" | "edit" | "delete">("none");
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);

  const [formName, setFormName] = useState("");
  const [formPlate, setFormPlate] = useState("");
  const [formType, setFormType] = useState<"Sedan" | "SUV" | "EV">("Sedan");
  const [formEvBodyType, setFormEvBodyType] = useState<"Sedan" | "SUV">("SUV");
  const [plateError, setPlateError] = useState("");
  const [nameError, setNameError] = useState("");

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
  }, [user?.token, setVehicles]);

  const resetForm = () => {
    setFormName("");
    setFormPlate("");
    setFormType("Sedan");
    setFormEvBodyType("SUV");
    setPlateError("");
    setNameError("");
  };

  const handleEditClick = (v: Vehicle) => {
    setSelectedVehicle(v);
    setFormName(v.name);
    setFormPlate(v.plate);
    setFormType(v.type);
    setFormEvBodyType(v.evBodyType || "SUV");
    setPlateError("");
    setNameError("");
    setSheet("edit");
  };

  const handleDeleteClick = (v: Vehicle) => {
    setSelectedVehicle(v);
    setSheet("delete");
  };

  const validatePlate = (p: string) => {
    const clean = p.replace(/\s+/g, "").toUpperCase();
    const regex = /^[0-9]{2}[A-Z][0-9]?-[0-9]{3,4}(\.[0-9]{2})?$/;
    return regex.test(clean) || clean.length >= 7;
  };

  const handleSave = async () => {
    const trimmedName = formName.trim();
    if (!trimmedName) {
      setNameError("Vui lòng nhập tên xe");
      return;
    }
    const upPlate = formPlate.trim().toUpperCase();
    if (!upPlate) {
      setPlateError("Vui lòng nhập biển số xe");
      return;
    }
    if (!validatePlate(upPlate)) {
      setPlateError("Biển số chưa đúng định dạng (VD: 43A-123.45)");
      return;
    }

    const token = user?.token || (typeof window !== "undefined" ? localStorage.getItem("ezspace_token") : null);

    if (sheet === "add") {
      let createdId = `v${Date.now()}`;
      if (token) {
        try {
          const res = await addVehicleApi(token, {
            license_plate: upPlate,
            vehicle_name: trimmedName,
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
        name: trimmedName,
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
            vehicle_name: trimmedName,
            license_plate: upPlate,
            vehicle_type: formType,
          });
        } catch (err) {
          console.warn("Lỗi sửa xe backend:", err);
        }
      }

      updateVehicle(selectedVehicle.id, {
        name: trimmedName,
        plate: upPlate,
        type: formType,
        evBodyType: formType === "EV" ? formEvBodyType : undefined,
      });
      addToast("Đã cập nhật thông tin xe", "success");
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
    <div className="relative min-h-full bg-slate-50 flex flex-col font-sans text-slate-800 antialiased selection:bg-blue-100 selection:text-blue-700 pb-16">
      {/* 1. DYNAMIC ISLAND & STATUS BAR */}
      <div className="sticky top-0 left-0 right-0 h-11 z-40 bg-white/80 backdrop-blur-md flex items-center justify-between px-6 pt-1 pointer-events-none select-none border-b border-slate-100">
        <span className="text-[13px] font-bold text-slate-900 tracking-tight">09:41</span>
        <div className="w-24 h-6 bg-slate-950 rounded-full flex items-center justify-end px-2 space-x-1.5 shadow-sm">
          <div className="w-2.5 h-2.5 rounded-full bg-slate-900 border border-slate-800" />
          <div className="w-2.5 h-2.5 rounded-full bg-blue-950 border border-blue-900" />
        </div>
        <div className="flex items-center space-x-1.5 text-slate-900 text-xs">
          <span>📶</span>
          <span>📶</span>
          <div className="w-5 h-2.5 border border-slate-800 rounded-xs p-0.5 flex items-center">
            <div className="h-full w-3/4 bg-slate-900 rounded-[1px]" />
          </div>
        </div>
      </div>

      {/* 2. HEADER */}
      <header className="sticky top-11 z-30 px-4 py-3 bg-white/95 backdrop-blur-md border-b border-slate-200/80 flex items-center justify-between shadow-xs">
        <div className="flex items-center space-x-2.5">
          <button
            type="button"
            onClick={() => router.back()}
            className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-95 transition flex items-center justify-center text-slate-700 cursor-pointer"
            aria-label="Quay lại"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-1.5">
              <span>Danh sách xe ({vehicles.length})</span>
            </h1>
            <p className="text-[10px] text-slate-400 font-medium">Tất cả phương tiện đã đăng ký</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            resetForm();
            setSheet("add");
          }}
          className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center hover:bg-primary-dark active:scale-95 transition shadow-sm cursor-pointer"
          title="Thêm xe mới"
        >
          <Plus size={16} />
        </button>
      </header>

      {/* 3. MAIN VEHICLES LIST */}
      <main className="flex-1 overflow-y-auto px-4 pt-3.5 space-y-3">
        {vehicles.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center border border-dashed border-slate-300 mt-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-primary flex items-center justify-center mx-auto mb-3">
              <CarFront size={28} />
            </div>
            <h3 className="text-sm font-bold text-slate-800">Chưa có phương tiện nào</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-[250px] mx-auto">
              Thêm xe để hệ thống tự động nhận diện biển số và gợi ý ô đỗ tối ưu nhất.
            </p>
            <button
              type="button"
              onClick={() => {
                resetForm();
                setSheet("add");
              }}
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2.5 bg-primary text-white rounded-xl text-xs font-bold shadow-md shadow-primary/20 hover:bg-primary-dark active:scale-95 transition-all cursor-pointer"
            >
              <Plus size={15} /> Thêm xe ngay
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {vehicles.map((v) => {
              const isSuv = v.type === "SUV";
              const isEv = v.type === "EV";

              return (
                <div
                  key={v.id}
                  className="w-full bg-white rounded-2xl p-4 shadow-sm border border-slate-200/90 relative flex flex-col justify-between hover:border-slate-300 transition-all"
                >
                  <div>
                    {/* Top row: Icon, Name, Type Badge */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        <div
                          className={clsx(
                            "w-11 h-11 rounded-xl flex items-center justify-center border",
                            isEv
                              ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                              : isSuv
                              ? "bg-orange-50 text-orange-600 border-orange-100"
                              : "bg-blue-50 text-blue-600 border-blue-100"
                          )}
                        >
                          {isEv ? (
                            <EvCarIcon className="w-6 h-6" />
                          ) : isSuv ? (
                            <Suv7SeatsIcon className="w-6 h-6" />
                          ) : (
                            <Sedan4SeatsIcon className="w-6 h-6" />
                          )}
                        </div>
                        <div>
                          <h3 className="text-sm font-extrabold text-slate-900">{v.name}</h3>
                          <p className="text-[10px] text-slate-400 font-medium">
                            {isEv
                              ? "Xe điện EV"
                              : isSuv
                              ? "Xe 7 chỗ (SUV / Crossover)"
                              : "Xe 4 chỗ (Sedan / Hatchback)"}
                          </p>
                        </div>
                      </div>

                      {/* Badge loại xe */}
                      <span
                        className={clsx(
                          "px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider",
                          isEv
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : isSuv
                            ? "bg-orange-50 text-orange-700 border border-orange-200"
                            : "bg-blue-50 text-blue-700 border border-blue-200"
                        )}
                      >
                        {isEv
                          ? v.evBodyType
                            ? `EV • ${v.evBodyType === "SUV" ? "7 CHỖ" : "4 CHỖ"}`
                            : "EV"
                          : isSuv
                          ? "SUV"
                          : "SEDAN"}
                      </span>
                    </div>

                    {/* Biển số xe */}
                    <div className="mt-3 bg-slate-50 border border-slate-800/80 rounded-xl p-2.5 shadow-inner flex items-center justify-between px-3.5">
                      <span className="text-[10px] font-extrabold text-slate-400">VN</span>
                      <span className="text-sm font-extrabold tracking-wider text-slate-900 flex-1 text-center pr-4">
                        {v.plate}
                      </span>
                    </div>
                  </div>

                  {/* Bottom row: Action buttons */}
                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-[11px] font-medium text-slate-400">
                      {isEv ? "Ưu tiên ô đỗ trụ sạc" : isSuv ? "Ô đỗ SUV / 7 chỗ" : "Ô đỗ Sedan / 4 chỗ"}
                    </span>
                    <div className="flex items-center space-x-1">
                      <button
                        type="button"
                        onClick={() => handleEditClick(v)}
                        className="p-1.5 text-slate-500 hover:text-primary rounded-lg hover:bg-slate-50 active:scale-90 transition cursor-pointer"
                        aria-label="Sửa xe"
                        title="Sửa thông tin"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteClick(v)}
                        className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 active:scale-90 transition cursor-pointer"
                        aria-label="Xóa xe"
                        title="Xóa xe"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Nút thêm xe mới ở dưới danh sách */}
            <button
              type="button"
              onClick={() => {
                resetForm();
                setSheet("add");
              }}
              className="w-full flex items-center justify-center space-x-2 py-3.5 rounded-2xl border-2 border-dashed border-primary/50 bg-blue-50/40 text-primary text-xs font-bold hover:bg-blue-50 active:scale-95 transition-all cursor-pointer mt-2"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm xe mới</span>
            </button>
          </div>
        )}
      </main>

      {/* MODAL / SHEET: THÊM HOẶC SỬA XE */}
      {(sheet === "add" || sheet === "edit") && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-xs flex flex-col justify-end"
          onClick={() => setSheet("none")}
        >
          <div
            className="bg-white rounded-t-[32px] p-5 shadow-2xl max-h-[90%] overflow-y-auto max-w-[430px] w-full mx-auto animate-in slide-in-from-bottom duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-4" />
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {sheet === "add" ? "Thêm xe mới" : "Chỉnh sửa xe"}
                </h3>
                <p className="text-[11px] text-slate-400">
                  Hệ thống dùng biển số để nhận diện khi xe vào bãi
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSheet("none")}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3.5">
              {/* Tên xe */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tên phương tiện <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => {
                    setFormName(e.target.value);
                    if (nameError) setNameError("");
                  }}
                  placeholder="Ví dụ: Honda Civic, Ford Everest, VF3..."
                  className={clsx(
                    "w-full bg-slate-50 border rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 outline-none transition",
                    nameError
                      ? "border-rose-400 bg-rose-50/30 focus:border-rose-500"
                      : "border-slate-200 focus:border-primary focus:bg-white"
                  )}
                />
                {nameError && (
                  <p className="text-[10px] text-rose-500 font-medium mt-1">{nameError}</p>
                )}
              </div>

              {/* Biển số xe */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Biển số xe <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formPlate}
                  onChange={(e) => {
                    setFormPlate(e.target.value.toUpperCase());
                    if (plateError) setPlateError("");
                  }}
                  placeholder="Ví dụ: 43A-123.45 hoặc 29A-888.99"
                  className={clsx(
                    "w-full bg-slate-50 border rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 uppercase tracking-wider outline-none transition",
                    plateError
                      ? "border-rose-400 bg-rose-50/30 focus:border-rose-500"
                      : "border-slate-200 focus:border-primary focus:bg-white"
                  )}
                />
                {plateError && (
                  <p className="text-[10px] text-rose-500 font-medium mt-1">{plateError}</p>
                )}
              </div>

              {/* Chọn loại xe với 3 logo xe 4 chỗ, xe 7 chỗ, xe điện */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  Loại phương tiện <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {/* Xe 4 chỗ (Sedan) */}
                  <button
                    type="button"
                    onClick={() => setFormType("Sedan")}
                    className={clsx(
                      "p-3 rounded-2xl border-2 flex flex-col items-center text-center transition-all cursor-pointer",
                      formType === "Sedan"
                        ? "border-primary bg-blue-50/70 shadow-xs"
                        : "border-slate-200 bg-white hover:bg-slate-50"
                    )}
                  >
                    <div
                      className={clsx(
                        "w-10 h-10 rounded-xl flex items-center justify-center mb-1.5",
                        formType === "Sedan"
                          ? "bg-primary text-white"
                          : "bg-blue-50 text-blue-600"
                      )}
                    >
                      <Sedan4SeatsIcon className="w-5 h-5" />
                    </div>
                    <span className="font-extrabold text-xs text-slate-900">Xe 4 chỗ</span>
                    <span className="text-[10px] text-slate-400 mt-0.5">Sedan / 4 chỗ</span>
                  </button>

                  {/* Xe 7 chỗ (SUV) */}
                  <button
                    type="button"
                    onClick={() => setFormType("SUV")}
                    className={clsx(
                      "p-3 rounded-2xl border-2 flex flex-col items-center text-center transition-all cursor-pointer",
                      formType === "SUV"
                        ? "border-orange-500 bg-orange-50/70 shadow-xs"
                        : "border-slate-200 bg-white hover:bg-slate-50"
                    )}
                  >
                    <div
                      className={clsx(
                        "w-10 h-10 rounded-xl flex items-center justify-center mb-1.5",
                        formType === "SUV"
                          ? "bg-orange-500 text-white"
                          : "bg-orange-50 text-orange-600"
                      )}
                    >
                      <Suv7SeatsIcon className="w-5 h-5" />
                    </div>
                    <span className="font-extrabold text-xs text-slate-900">Xe 7 chỗ</span>
                    <span className="text-[10px] text-slate-400 mt-0.5">SUV / 7 chỗ</span>
                  </button>

                  {/* Xe điện (EV) */}
                  <button
                    type="button"
                    onClick={() => setFormType("EV")}
                    className={clsx(
                      "p-3 rounded-2xl border-2 flex flex-col items-center text-center transition-all cursor-pointer",
                      formType === "EV"
                        ? "border-emerald-500 bg-emerald-50/70 shadow-xs"
                        : "border-slate-200 bg-white hover:bg-slate-50"
                    )}
                  >
                    <div
                      className={clsx(
                        "w-10 h-10 rounded-xl flex items-center justify-center mb-1.5",
                        formType === "EV"
                          ? "bg-emerald-500 text-white"
                          : "bg-emerald-50 text-emerald-600"
                      )}
                    >
                      <EvCarIcon className="w-5 h-5" />
                    </div>
                    <span className="font-extrabold text-xs text-slate-900">Xe điện</span>
                    <span className="text-[10px] text-slate-400 mt-0.5">EV sạc pin</span>
                  </button>
                </div>

                {/* Nếu chọn EV: hỏi thêm dáng xe 4 chỗ hay 7 chỗ */}
                {formType === "EV" && (
                  <div className="mt-3 p-3 bg-emerald-50/60 rounded-xl border border-emerald-200">
                    <label className="block text-xs font-bold text-emerald-900 mb-1.5 flex items-center gap-1.5">
                      <Zap size={14} className="text-emerald-600" />
                      <span>Kích thước xe điện của bạn:</span>
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setFormEvBodyType("Sedan")}
                        className={clsx(
                          "py-2 px-3 rounded-lg border text-xs font-bold flex items-center justify-center gap-1.5 transition",
                          formEvBodyType === "Sedan"
                            ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                            : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                        )}
                      >
                        <Sedan4SeatsIcon className="w-4 h-4" />
                        <span>Dáng 4 chỗ</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormEvBodyType("SUV")}
                        className={clsx(
                          "py-2 px-3 rounded-lg border text-xs font-bold flex items-center justify-center gap-1.5 transition",
                          formEvBodyType === "SUV"
                            ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                            : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                        )}
                      >
                        <Suv7SeatsIcon className="w-4 h-4" />
                        <span>Dáng 7 chỗ</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Nút lưu */}
              <button
                type="button"
                onClick={handleSave}
                className="w-full mt-4 h-12 bg-primary text-white font-extrabold rounded-2xl shadow-md shadow-primary/20 hover:bg-primary-dark active:scale-95 transition-all cursor-pointer"
              >
                {sheet === "add" ? "Thêm xe vào danh sách" : "Lưu thay đổi"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: XÁC NHẬN XÓA XE */}
      {sheet === "delete" && selectedVehicle && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setSheet("none")}
        >
          <div
            className="bg-white rounded-3xl p-5 max-w-sm w-full shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h3 className="text-base font-extrabold text-slate-900">Xóa phương tiện?</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Bạn có chắc chắn muốn xóa xe{" "}
                <strong className="text-slate-800">
                  {selectedVehicle.name} ({selectedVehicle.plate})
                </strong>
                ? Thao tác này sẽ xóa xe khỏi hệ thống.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setSheet("none")}
                className="py-2.5 px-4 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 active:scale-95 transition cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="py-2.5 px-4 rounded-xl bg-rose-600 text-xs font-bold text-white hover:bg-rose-700 active:scale-95 transition shadow-sm cursor-pointer"
              >
                Xác nhận xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
