import React, { useState } from 'react';
import { Download, Share2, X } from 'lucide-react';
import { usePWAInstall } from './usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        onClick={install}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-cyan-950 bg-cyan-400 hover:bg-cyan-300 rounded-md transition-colors shadow-sm shadow-cyan-500/20 whitespace-nowrap shrink-0"
        title="安装应用至桌面或副屏"
      >
        <Download className="w-3.5 h-3.5" />
        <span>安装 PWA</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-md transition-colors whitespace-nowrap shrink-0"
        >
          <Share2 className="w-3.5 h-3.5" />
          <span>添加到主屏幕</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
            <div className="w-full max-w-sm rounded-xl bg-slate-900 border border-slate-700 p-5 shadow-2xl text-slate-200">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <h3 className="text-sm font-semibold text-white">添加到 iOS 主屏幕 (副屏查阅)</h3>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="p-1 text-slate-400 hover:text-white rounded"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="mt-3 space-y-2 text-xs text-slate-300">
                <p>1. 点击 Safari 底部工具栏的【分享 (Share)】按钮。</p>
                <p>2. 在菜单中向下滚动，点击【添加到主屏幕】。</p>
                <p>3. 即可在手机或平板上全屏无干扰离线使用该蓝图计算器。</p>
              </div>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-4 w-full py-2 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition"
              >
                我知道了
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
