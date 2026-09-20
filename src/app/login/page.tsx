"use client";

import React, { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { loginAction } from "@/actions/auth";
import {
  Coffee,
  Lock,
  Mail,
  Shield,
  Truck,
  Building,
  ArrowRight,
  Loader2,
  AlertCircle,
  Sparkles,
} from "lucide-react";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full py-3 px-4 bg-coffee-800 hover:bg-coffee-900 active:scale-[0.99] text-white font-bold text-sm rounded-xl shadow-lg shadow-coffee-950/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
    >
      {pending ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin text-amber-300" />
          <span>Iniciando sesión...</span>
        </>
      ) : (
        <>
          <span>Ingresar a VendyTrack</span>
          <ArrowRight className="w-4 h-4" />
        </>
      )}
    </button>
  );
}

export default function LoginPage() {
  const [state, formAction] = useFormState(loginAction, null);
  const [emailInput, setEmailInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");

  const handleQuickLogin = (email: string, pass: string) => {
    setEmailInput(email);
    setPasswordInput(pass);
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 py-8 bg-stone-100 dark:bg-stone-950">
      <div className="w-full max-w-sm space-y-6">
        {/* Cabecera y Logo */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-gradient-to-br from-coffee-700 to-coffee-900 text-amber-300 rounded-2xl flex items-center justify-center mx-auto shadow-glow">
            <Coffee className="w-9 h-9" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-stone-900 dark:text-white">
            VendyTrack
          </h1>
          <p className="text-xs text-stone-500 max-w-xs mx-auto">
            Sistema de Gestión de Rutas y Liquidación de Máquinas de Café Vending
          </p>
        </div>

        {/* Tarjeta de Formulario */}
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 shadow-mobile space-y-5">
          {state?.error && (
            <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl p-3 flex items-center gap-2 text-xs text-rose-800 dark:text-rose-200 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span>{state.error}</span>
            </div>
          )}

          <form action={formAction} className="space-y-4">
            {/* Campo Email */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-coffee-600" />
                Correo Electrónico
              </label>
              <input
                type="email"
                name="email"
                required
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="ej. operador@vendytrack.com"
                className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl px-3.5 py-2.5 text-xs text-stone-900 dark:text-white outline-none focus:border-coffee-600 focus:ring-1 focus:ring-coffee-600 transition-all"
              />
            </div>

            {/* Campo Contraseña */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-coffee-600" />
                Contraseña
              </label>
              <input
                type="password"
                name="password"
                required
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl px-3.5 py-2.5 text-xs text-stone-900 dark:text-white outline-none focus:border-coffee-600 focus:ring-1 focus:ring-coffee-600 transition-all"
              />
            </div>

            <SubmitButton />
          </form>

          {/* Accesos rápidos de prueba (Demo) */}
          <div className="pt-3 border-t border-stone-100 dark:border-stone-800 space-y-2">
            <div className="flex items-center justify-between text-[11px] text-stone-500 font-medium">
              <span className="flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-500" />
                Cuentas de prueba rápida:
              </span>
              <span className="text-[10px] text-stone-400">Clic para rellenar</span>
            </div>

            <div className="grid grid-cols-3 gap-1.5">
              {/* Rutero */}
              <button
                type="button"
                onClick={() =>
                  handleQuickLogin("carlos.operador@vendytrack.com", "ruta123")
                }
                className="p-2 rounded-lg border border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20 hover:bg-amber-100 text-left transition-colors group"
              >
                <div className="flex items-center gap-1 text-amber-800 dark:text-amber-300 font-bold text-[10px]">
                  <Truck className="w-3 h-3" /> Rutero
                </div>
                <span className="text-[9px] text-stone-500 block truncate">
                  carlos.operador
                </span>
              </button>

              {/* Administrador */}
              <button
                type="button"
                onClick={() =>
                  handleQuickLogin("admin@vendytrack.com", "admin123")
                }
                className="p-2 rounded-lg border border-purple-200 dark:border-purple-900/50 bg-purple-50/50 dark:bg-purple-950/20 hover:bg-purple-100 text-left transition-colors group"
              >
                <div className="flex items-center gap-1 text-purple-800 dark:text-purple-300 font-bold text-[10px]">
                  <Shield className="w-3 h-3" /> Admin
                </div>
                <span className="text-[9px] text-stone-500 block truncate">
                  admin@vendy
                </span>
              </button>

              {/* Cliente */}
              <button
                type="button"
                onClick={() =>
                  handleQuickLogin("cliente@sanitas.com", "cliente123")
                }
                className="p-2 rounded-lg border border-blue-200 dark:border-blue-900/50 bg-blue-50/50 dark:bg-blue-950/20 hover:bg-blue-100 text-left transition-colors group"
              >
                <div className="flex items-center gap-1 text-blue-800 dark:text-blue-300 font-bold text-[10px]">
                  <Building className="w-3 h-3" /> Cliente
                </div>
                <span className="text-[9px] text-stone-500 block truncate">
                  cliente@sanitas
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Pie de página */}
        <p className="text-center text-[11px] text-stone-400">
          VendyTrack PWA • Arquitectura Serverless en Vercel
        </p>
      </div>
    </div>
  );
}
