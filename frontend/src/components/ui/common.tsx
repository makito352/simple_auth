/**
 * @file frontend/src/components/ui/common.tsx
 * @description 共通UIコンポーネント
 */

import React from "react";

/**
 * 標準的なボタンコンポーネント
 */
export const Button = ({ 
  children, 
  onClick, 
  disabled, 
  variant = "primary", 
  className = "" 
}: { 
  children: React.ReactNode; 
  onClick?: () => void; 
  disabled?: boolean; 
  variant?: "primary" | "secondary"; 
  className?: string;
}) => {
  const baseClass = "px-6 py-2 rounded-md transition-colors disabled:opacity-50 font-medium";
  const variants = {
    // 共通の主要アクション
    primary: "bg-blue-600 hover:bg-blue-700 text-white",
    // キャンセルなど
    secondary: "bg-gray-500 hover:bg-gray-600 text-white",
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${baseClass} ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
};

/**
 * フォームラベルコンポーネント
 */
export const Label = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <label className={`block text-sm font-sm text-gray-700 ${className}`}>
    {children}
  </label>
);

/**
 * 成功通知用のカードコンポーネント
 */
export const SuccessCard = ({ title, message, subtext }: { title: string; message: string; subtext?: string }) => (
  <div className="bg-green-50 border border-green-200 p-6 rounded-lg">
    <h2 className="text-xl font-bold text-green-800 mb-2">{title}</h2>
    <p className="text-gray-700">{message}</p>
    {subtext && <p className="mt-4 text-sm text-gray-600">{subtext}</p>}
  </div>
);

/**
 * 共通のページレイアウト（最大幅と余白の設定）
 */
export const PageWrapper = ({ children }: { children: React.ReactNode }) => (
  <div className="max-w-[560px] mx-auto px-6 py-12">
    {children}
  </div>
);