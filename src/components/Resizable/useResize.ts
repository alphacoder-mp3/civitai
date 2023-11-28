import { useCallback, useEffect, useRef, useState } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { usePersistentStore } from '~/utils/zustand-helpers';

type Props = {
  orientation?: 'horizontal' | 'vertical';
  resizePosition?: 'left' | 'right' | 'top' | 'bottom';
  minWidth?: number;
  maxWidth?: number;
  defaultWidth?: number;
  name: string;
};

const clientRectDict = {
  left: 'right',
  right: 'left',
  top: 'bottom',
  bottom: 'top',
} as const;

export const useResizeStore = create<Record<string, number>>()(
  persist(() => ({}), { name: 'resizable' })
);

// export const useResizeValue = (name: string, defaultValue?: number) => {
//   return usePersistentStore(useResizableSidebarStore, (state) => state[name], defaultValue);
// };

export const useResize = (options: Props) => {
  const {
    orientation = 'horizontal',
    resizePosition,
    minWidth,
    maxWidth,
    defaultWidth,
    name,
  } = options ?? {};
  const [ref, setRef] = useState<HTMLElement | null>(null);
  const [resizerRef, setResizerRef] = useState<HTMLElement | null>(null);
  const [contentRef, setContentRef] = useState<HTMLElement | null>(null);
  const [isResizing, setIsResizing] = useState(false);
  const sidebarWidth = useResizeStore(
    useCallback((state) => state[name] ?? defaultWidth, [name, defaultWidth])
  );

  useEffect(() => {
    useResizeStore.setState(() => ({ [name]: sidebarWidth }));
  }, [name]) // eslint-disable-line

  const mouseMoveClient = orientation === 'horizontal' ? 'clientX' : 'clientY';

  const startResizing = useCallback(() => {
    setIsResizing(true);
  }, []);

  const stopResizing = useCallback(() => {
    setIsResizing(false);
  }, []);

  const resize = useCallback(
    (mouseMoveEvent: MouseEvent) => {
      if (isResizing && ref) {
        const getWidth = () => {
          const clientPosition = mouseMoveEvent[mouseMoveClient];
          const width = resizePosition
            ? clientPosition - ref.getBoundingClientRect()[clientRectDict[resizePosition]]
            : clientPosition;

          if (minWidth && width < minWidth) return minWidth;
          if (maxWidth && width > maxWidth) return maxWidth;

          return width;
        };
        useResizeStore.setState(() => ({ [name]: getWidth() }));
      }
    },
    [isResizing] // eslint-disable-line
  );

  useEffect(() => {
    if (ref) ref.style.width = `${sidebarWidth}px`;
    if (contentRef) contentRef.style.overflowX = 'auto';
  }, [sidebarWidth, ref, contentRef]);

  // useEffect(() => {
  //   if (resizerRef) {
  //     resizerRef.addEventListener('click', startResizing);
  //   }
  //   return () => resizerRef?.removeEventListener('click', startResizing);
  // }, [resizerRef, startResizing]);

  useEffect(() => {
    const handleContainerClick = (e: MouseEvent) => e.preventDefault();
    window.addEventListener('mousemove', resize);
    window.addEventListener('mouseup', stopResizing);
    resizerRef?.addEventListener('mousedown', startResizing);
    ref?.addEventListener('mousedown', handleContainerClick);
    return () => {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
      resizerRef?.removeEventListener('mousedown', startResizing);
      ref?.removeEventListener('mousedown', handleContainerClick);
    };
  }, [resize, stopResizing, resizerRef, ref, startResizing]);

  return {
    containerRef: setRef,
    resizerRef: setResizerRef,
    contentRef: setContentRef,
  };
};