"use client";

import React, { useState, useEffect } from "react";
import { crearFormula, ejecutarProduccion, editarFormula, eliminarFormula } from "@/actions/produccion";
import { Package, Beaker, Plus, Save, Play, Search, AlertCircle, RefreshCw, Edit2, Trash2, X } from "lucide-react";

export default function ProduccionClient({ formulas, insumos }: { formulas: any[], insumos: any[] }) {
  const [activeTab, setActiveTab] = useState<"formulas" | "produccion">("formulas");

  // State for Crear Formula
  const [formulaName, setFormulaName] = useState("");
  const [resultInsumoId, setResultInsumoId] = useState("");
  const [ingredients, setIngredients] = useState<{ insumoId: string, cantidadRequerida: string }[]>([{ insumoId: "", cantidadRequerida: "" }]);
  const [isCreatingFormula, setIsCreatingFormula] = useState(false);
  const [editingFormulaId, setEditingFormulaId] = useState<string | null>(null);

  // State for Ejecutar Produccion
  const [selectedFormulaId, setSelectedFormulaId] = useState("");
  const [cantidadProducida, setCantidadProducida] = useState("");
  const [numeroLote, setNumeroLote] = useState("");
  const [lotesSeleccionados, setLotesSeleccionados] = useState<{ insumoId: string, loteId: string, cantidadUsada: string }[]>([]);
  const [isProducing, setIsProducing] = useState(false);

  const [message, setMessage] = useState({ text: "", type: "" });

  const handleAddIngredient = () => {
    setIngredients([...ingredients, { insumoId: "", cantidadRequerida: "" }]);
  };

  const handleIngredientChange = (index: number, field: string, value: string) => {
    const newIngredients = [...ingredients];
    newIngredients[index] = { ...newIngredients[index], [field]: value };
    setIngredients(newIngredients);
  };

  const handleRemoveIngredient = (index: number) => {
    const newIngredients = ingredients.filter((_, i) => i !== index);
    setIngredients(newIngredients);
  };

  const handleCrearFormula = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formulaName || !resultInsumoId || ingredients.some(i => !i.insumoId || !i.cantidadRequerida)) {
      setMessage({ text: "Por favor completa todos los campos de la fórmula", type: "error" });
      return;
    }
    
    setIsCreatingFormula(true);
    let result;
    
    if (editingFormulaId) {
      result = await editarFormula(
        editingFormulaId,
        formulaName,
        ingredients.map(i => ({ insumoId: i.insumoId, cantidad: Number(i.cantidadRequerida) }))
      );
    } else {
      result = await crearFormula(
        formulaName,
        resultInsumoId,
        ingredients.map(i => ({ insumoId: i.insumoId, cantidadRequerida: Number(i.cantidadRequerida) }))
      );
    }

    setIsCreatingFormula(false);
    if (result.success) {
      setMessage({ text: editingFormulaId ? "Fórmula actualizada exitosamente" : "Fórmula creada exitosamente", type: "success" });
      setFormulaName("");
      setResultInsumoId("");
      setIngredients([{ insumoId: "", cantidadRequerida: "" }]);
      setEditingFormulaId(null);
      window.location.reload();
    } else {
      setMessage({ text: result.error || "Error al guardar fórmula", type: "error" });
    }
  };

  const handleEditClick = (f: any) => {
    setEditingFormulaId(f.id);
    setFormulaName(f.nombre);
    setResultInsumoId(f.insumoResultanteId);
    setIngredients(
      f.ingredientes.map((ing: any) => ({
        insumoId: ing.insumoIngredienteId,
        cantidadRequerida: ing.cantidadRequerida.toString()
      }))
    );
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingFormulaId(null);
    setFormulaName("");
    setResultInsumoId("");
    setIngredients([{ insumoId: "", cantidadRequerida: "" }]);
  };

  const handleDeleteClick = async (formulaId: string) => {
    if (!window.confirm("¿Estás seguro de eliminar esta fórmula?")) return;
    
    const result = await eliminarFormula(formulaId);
    if (result.success) {
      setMessage({ text: "Fórmula eliminada exitosamente", type: "success" });
      window.location.reload();
    } else {
      setMessage({ text: result.error || "Error al eliminar fórmula", type: "error" });
    }
  };

  const selectedFormula = formulas.find(f => f.id === selectedFormulaId);

  useEffect(() => {
    if (selectedFormula && cantidadProducida) {
      const cant = parseFloat(cantidadProducida) || 0;
      if (cant > 0) {
        setLotesSeleccionados(prev => prev.map(l => {
          const ing = selectedFormula.ingredientes.find((i: any) => i.insumoIngredienteId === l.insumoId);
          if (ing) {
            // Se calcula en función de la cantidad requerida por unidad y se convierte a string (máx. 3 decimales)
            return { ...l, cantidadUsada: (cant * Number(ing.cantidadRequerida)).toFixed(3).replace(/\.?0+$/, '') };
          }
          return l;
        }));
      }
    } else if (selectedFormula && !cantidadProducida) {
      setLotesSeleccionados(prev => prev.map(l => ({ ...l, cantidadUsada: "" })));
    }
  }, [cantidadProducida, selectedFormula]);

  const handleFormulaSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const fId = e.target.value;
    setSelectedFormulaId(fId);
    
    const formula = formulas.find(f => f.id === fId);
    if (formula) {
      // Setup default lotesSeleccionados array for the required ingredients
      const defaultLotes = formula.ingredientes.map((ing: any) => ({
        insumoId: ing.insumoIngredienteId,
        loteId: "",
        cantidadUsada: "",
      }));
      setLotesSeleccionados(defaultLotes);
    } else {
      setLotesSeleccionados([]);
    }
  };

  const handleLoteSelectionChange = (insumoId: string, field: string, value: string) => {
    setLotesSeleccionados(prev => prev.map(l => 
      l.insumoId === insumoId ? { ...l, [field]: value } : l
    ));
  };

  const handleEjecutarProduccion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFormulaId || !cantidadProducida || !numeroLote) {
      setMessage({ text: "Completa los campos principales de producción", type: "error" });
      return;
    }

    if (lotesSeleccionados.some(l => !l.loteId || !l.cantidadUsada)) {
      setMessage({ text: "Selecciona el lote y cantidad usada para cada ingrediente", type: "error" });
      return;
    }

    setIsProducing(true);
    const result = await ejecutarProduccion(
      selectedFormulaId,
      Number(cantidadProducida),
      numeroLote,
      lotesSeleccionados.map(l => ({
        insumoId: l.insumoId,
        loteId: l.loteId,
        cantidadUsada: Number(l.cantidadUsada)
      }))
    );

    setIsProducing(false);
    if (result.success) {
      setMessage({ text: "Producción ejecutada exitosamente", type: "success" });
      setSelectedFormulaId("");
      setCantidadProducida("");
      setNumeroLote("");
      setLotesSeleccionados([]);
      window.location.reload();
    } else {
      setMessage({ text: result.error || "Error al ejecutar producción", type: "error" });
    }
  };

  return (
    <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-sm overflow-hidden">
      {/* Tabs */}
      <div className="flex border-b border-stone-200 dark:border-stone-800">
        <button
          onClick={() => setActiveTab("formulas")}
          className={`flex-1 py-4 px-6 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${
            activeTab === "formulas"
              ? "border-b-2 border-coffee-600 text-coffee-700 dark:text-amber-400 dark:border-amber-400 bg-stone-50 dark:bg-stone-800/50"
              : "text-stone-500 hover:text-stone-700 dark:hover:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800/30"
          }`}
        >
          <Beaker className="w-4 h-4" />
          Fórmulas y Recetas
        </button>
        <button
          onClick={() => setActiveTab("produccion")}
          className={`flex-1 py-4 px-6 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${
            activeTab === "produccion"
              ? "border-b-2 border-purple-600 text-purple-700 dark:text-purple-400 dark:border-purple-400 bg-stone-50 dark:bg-stone-800/50"
              : "text-stone-500 hover:text-stone-700 dark:hover:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800/30"
          }`}
        >
          <Package className="w-4 h-4" />
          Órdenes de Producción
        </button>
      </div>

      <div className="p-6">
        {message.text && (
          <div className={`mb-6 p-4 rounded-xl flex items-start gap-3 text-sm ${
            message.type === "success" 
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-900 dark:text-emerald-400"
              : "bg-red-50 text-red-800 border border-red-200 dark:bg-red-950/30 dark:border-red-900 dark:text-red-400"
          }`}>
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p className="mt-0.5">{message.text}</p>
          </div>
        )}

        {/* Tab Fórmulas */}
        {activeTab === "formulas" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Formulario Crear Fórmula */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-stone-900 dark:text-white">
                  {editingFormulaId ? "Editar Fórmula" : "Crear Nueva Fórmula"}
                </h2>
                {editingFormulaId && (
                  <button
                    onClick={handleCancelEdit}
                    className="text-xs flex items-center gap-1 text-stone-500 hover:text-stone-700 dark:hover:text-stone-300"
                  >
                    <X className="w-4 h-4" /> Cancelar
                  </button>
                )}
              </div>
              <form onSubmit={handleCrearFormula} className="space-y-4 bg-stone-50 dark:bg-stone-800/30 p-5 rounded-2xl border border-stone-200 dark:border-stone-800">
                
                <div>
                  <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1.5 uppercase">
                    Nombre de la Fórmula
                  </label>
                  <input
                    type="text"
                    value={formulaName}
                    onChange={(e) => setFormulaName(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-coffee-500"
                    placeholder="Ej. Mezcla Café Institucional 5kg"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1.5 uppercase">
                    Insumo Resultante
                  </label>
                  <select
                    value={resultInsumoId}
                    onChange={(e) => setResultInsumoId(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-coffee-500 disabled:opacity-50"
                    required
                    disabled={!!editingFormulaId}
                  >
                    <option value="">Seleccione un insumo...</option>
                    {insumos.map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.nombre} ({i.codigo})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="pt-2 border-t border-stone-200 dark:border-stone-700">
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 uppercase">
                      Ingredientes
                    </label>
                    <button
                      type="button"
                      onClick={handleAddIngredient}
                      className="text-xs text-coffee-600 dark:text-amber-400 font-semibold flex items-center gap-1 hover:underline"
                    >
                      <Plus className="w-3 h-3" /> Añadir Ingrediente
                    </button>
                  </div>
                  
                  <div className="space-y-3">
                    {ingredients.map((ing, index) => (
                      <div key={index} className="flex gap-2 items-start bg-white dark:bg-stone-900 p-3 rounded-xl border border-stone-200 dark:border-stone-800">
                        <div className="flex-1">
                          <select
                            value={ing.insumoId}
                            onChange={(e) => handleIngredientChange(index, "insumoId", e.target.value)}
                            className="w-full px-3 py-1.5 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-lg text-sm mb-2"
                            required
                          >
                            <option value="">Seleccione ingrediente...</option>
                            {insumos.map((i) => (
                              <option key={i.id} value={i.id}>
                                {i.nombre}
                              </option>
                            ))}
                          </select>
                          <input
                            type="number"
                            step="0.001"
                            value={ing.cantidadRequerida}
                            onChange={(e) => handleIngredientChange(index, "cantidadRequerida", e.target.value)}
                            className="w-full px-3 py-1.5 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-lg text-sm"
                            placeholder="Cantidad requerida"
                            required
                          />
                        </div>
                        {ingredients.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveIngredient(index)}
                            className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors"
                          >
                            <AlertCircle className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-4 flex gap-2">
                  <button
                    type="submit"
                    disabled={isCreatingFormula}
                    className="flex-1 flex items-center justify-center gap-2 bg-coffee-600 hover:bg-coffee-700 text-white py-2.5 rounded-xl font-semibold text-sm transition-colors disabled:opacity-50"
                  >
                    {isCreatingFormula ? <RefreshCw className="w-4 h-4 animate-spin" /> : (editingFormulaId ? <Edit2 className="w-4 h-4" /> : <Save className="w-4 h-4" />)}
                    {editingFormulaId ? "Actualizar Fórmula" : "Guardar Fórmula"}
                  </button>
                </div>
              </form>
            </div>

            {/* Listado de Fórmulas */}
            <div>
              <h2 className="text-lg font-bold text-stone-900 dark:text-white mb-4">Fórmulas Existentes</h2>
              <div className="space-y-3">
                {formulas.length === 0 ? (
                  <p className="text-sm text-stone-500 text-center py-8">No hay fórmulas creadas aún.</p>
                ) : (
                  formulas.map((f: any) => (
                    <div key={f.id} className="border border-stone-200 dark:border-stone-800 rounded-xl p-4 bg-white dark:bg-stone-900 hover:border-coffee-300 transition-colors group relative">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-bold text-stone-900 dark:text-white">{f.nombre}</h3>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEditClick(f)}
                            className="p-1.5 text-stone-400 hover:text-coffee-600 hover:bg-coffee-50 dark:hover:bg-coffee-950/30 rounded-lg transition-colors"
                            title="Editar"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(f.id)}
                            className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          <span className="text-[10px] font-bold px-2 py-1 bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 rounded-lg ml-2">
                            RESULTADO: {f.insumoResultante.codigo}
                          </span>
                        </div>
                      </div>
                      <p className="text-sm text-stone-500 dark:text-stone-400 mb-3">
                        Produce: <span className="font-semibold">{f.insumoResultante.nombre}</span>
                      </p>
                      <div className="bg-stone-50 dark:bg-stone-800/30 rounded-lg p-3">
                        <h4 className="text-[10px] font-bold text-stone-400 uppercase mb-2">Ingredientes Requeridos:</h4>
                        <ul className="space-y-1">
                          {f.ingredientes.map((ing: any) => (
                            <li key={ing.id} className="text-xs text-stone-600 dark:text-stone-300 flex justify-between">
                              <span>• {ing.insumo.nombre}</span>
                              <span className="font-semibold">{Number(ing.cantidadRequerida)} {ing.insumo.unidadMedida}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab Producción */}
        {activeTab === "produccion" && (
          <div className="max-w-2xl mx-auto">
            <h2 className="text-lg font-bold text-stone-900 dark:text-white mb-4 flex items-center gap-2">
              <Play className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              Ejecutar Orden de Producción
            </h2>
            
            <form onSubmit={handleEjecutarProduccion} className="space-y-6 bg-stone-50 dark:bg-stone-800/30 p-6 rounded-2xl border border-stone-200 dark:border-stone-800">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1.5 uppercase">
                    Seleccionar Fórmula
                  </label>
                  <select
                    value={selectedFormulaId}
                    onChange={handleFormulaSelect}
                    className="w-full px-4 py-2.5 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-purple-500"
                    required
                  >
                    <option value="">Seleccione una fórmula a producir...</option>
                    {formulas.map((f: any) => (
                      <option key={f.id} value={f.id}>
                        {f.nombre} (Resulta: {f.insumoResultante.nombre})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1.5 uppercase">
                    Cantidad a Producir
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    value={cantidadProducida}
                    onChange={(e) => setCantidadProducida(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Ej. 50"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1.5 uppercase">
                    Número de Lote Resultante
                  </label>
                  <input
                    type="text"
                    value={numeroLote}
                    onChange={(e) => setNumeroLote(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl text-sm font-medium uppercase focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Ej. LOTE-PROD-001"
                    required
                  />
                </div>
              </div>

              {selectedFormula && (
                <div className="pt-4 border-t border-stone-200 dark:border-stone-700">
                  <h3 className="text-sm font-bold text-stone-900 dark:text-white mb-3">
                    Asignación de Lotes para Ingredientes
                  </h3>
                  <div className="space-y-4">
                    {selectedFormula.ingredientes.map((ing: any) => {
                      const insumoData = insumos.find((i: any) => i.id === ing.insumoIngredienteId);
                      const existencias = insumoData ? insumoData.existencias : [];
                      
                      const selectedLoteData = lotesSeleccionados.find(l => l.insumoId === ing.insumoIngredienteId);

                      return (
                        <div key={ing.id} className="bg-white dark:bg-stone-900 p-4 rounded-xl border border-stone-200 dark:border-stone-800 flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                          <div className="flex-1">
                            <p className="font-semibold text-sm text-stone-900 dark:text-white">
                              {ing.insumo.nombre}
                            </p>
                            <p className="text-xs text-stone-500">
                              Requerido por fórmula: {Number(ing.cantidadRequerida)} {ing.insumo.unidadMedida}
                            </p>
                          </div>
                          <div className="w-full sm:w-2/3 grid grid-cols-2 gap-2">
                            <select
                              value={selectedLoteData?.loteId || ""}
                              onChange={(e) => handleLoteSelectionChange(ing.insumoIngredienteId, "loteId", e.target.value)}
                              className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-lg text-sm"
                              required
                            >
                              <option value="">Seleccionar Lote...</option>
                              {existencias.map((ex: any) => (
                                <option key={ex.lote.id} value={ex.lote.id}>
                                  Lote {ex.lote.numeroLote} (Disp: {Number(ex.cantidad)})
                                </option>
                              ))}
                            </select>
                            <div>
                              <input
                                type="number"
                                step="0.001"
                                value={selectedLoteData?.cantidadUsada || ""}
                                onChange={(e) => handleLoteSelectionChange(ing.insumoIngredienteId, "cantidadUsada", e.target.value)}
                                className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-lg text-sm"
                                placeholder="Cant. a descontar"
                                required
                              />
                              {selectedLoteData?.loteId && (
                                <p className="text-[10px] text-stone-500 mt-1">
                                  Disp: {Number(existencias.find((ex: any) => ex.lote.id === selectedLoteData.loteId)?.cantidad || 0)} {ing.insumo.unidadMedida}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={isProducing || !selectedFormula}
                  className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-xl font-bold text-sm transition-colors disabled:opacity-50"
                >
                  {isProducing ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" />}
                  Ejecutar Producción
                </button>
              </div>
            </form>
          </div>
        )}

      </div>
    </div>
  );
}
