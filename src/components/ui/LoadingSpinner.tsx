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
      <div className="relative w-12 h-12 mx-auto mb-4">
        {/* Background circle */}
        <div className="absolute inset-0 border-4 border-gray-200 rounded-full"></div>
        {/* Animated green circle */}
        <div className="absolute inset-0 border-4 border-transparent border-t-green-500 rounded-full animate-spin" style={{ borderTopColor: '#10b981' }}></div>
      </div>
      <p className="text-gray-600 text-sm sm:text-base font-medium">{text}</p>
    </div>
  );

  if (absolute) {
    return (
      <div 
        className={`fixed inset-0 flex items-center justify-center z-50 ${className}`}
        style={{ 
          background: 'linear-gradient(135deg, #f0f8f5 0%, #f8fcfa 100%)'
        }}
      >
        {content}
      </div>
    );
  }

  if (!fullScreen) {
    return <div className={`flex items-center justify-center py-12 ${className}`}>{content}</div>;
  }

  return (
    <div 
      className={`min-h-screen flex items-center justify-center ${className}`}
      style={{ 
        background: 'linear-gradient(135deg, #f0f8f5 0%, #f8fcfa 100%)'
      }}
    >
      {content}
    </div>
  );
}