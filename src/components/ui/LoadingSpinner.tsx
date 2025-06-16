'use client';

interface LoadingSpinnerProps {
  text?: string;
  className?: string;
  fullScreen?: boolean;
  absolute?: boolean; // 絶対位置指定で完全に中央表示
}

export default function LoadingSpinner({ 
  text = "読み込み中...", 
  className = "",
  fullScreen = true,
  absolute = false
}: LoadingSpinnerProps) {
  const content = (
    <div className="text-center">
      <div className="relative w-8 h-8 mx-auto mb-3">
        <div className="absolute inset-0 border-4 border-white/20 rounded-full"></div>
        <div className="absolute inset-0 border-4 border-transparent border-t-white/70 rounded-full animate-spin"></div>
      </div>
      <p className="text-white/70 text-sm sm:text-base">{text}</p>
    </div>
  );

  if (absolute) {
    return (
      <div className={`fixed inset-0 flex items-center justify-center z-50 ${className}`}>
        {content}
      </div>
    );
  }

  if (!fullScreen) {
    return <div className={`flex items-center justify-center py-12 ${className}`}>{content}</div>;
  }

  return (
    <div className={`min-h-screen flex items-center justify-center ${className}`}>
      {content}
    </div>
  );
}