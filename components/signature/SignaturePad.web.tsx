import React, { useRef, useImperativeHandle, forwardRef } from 'react';
import { DimensionValue, View } from 'react-native';
// @ts-ignore
import ReactSignatureCanvas from 'react-signature-canvas';

export interface SignaturePadRef {
  clear: () => void;
  undo: () => void;
  save: () => void;
}

interface Props {
  onOK: (signature: string) => void;
  onEmpty: () => void;
  onBegin?: () => void;
  onEnd?: () => void;
  onError?: (error: Error) => void;
  height?: DimensionValue;
  width?: DimensionValue;
}

export const SignaturePad = forwardRef<SignaturePadRef, Props>(({ onOK, onEmpty, onBegin, onEnd, height, width }, ref) => {
  const signatureRef = useRef<any>(null);

  useImperativeHandle(ref, () => ({
    clear: () => signatureRef.current?.clear(),
    undo: () => {
       const data = signatureRef.current?.toData();
       if (data && data.length > 0) {
          data.pop();
          signatureRef.current?.fromData(data);
       }
    },
    save: () => {
      if (signatureRef.current?.isEmpty()) {
        onEmpty();
      } else {
        onOK(signatureRef.current?.getTrimmedCanvas().toDataURL('image/png'));
      }
    },
  }));

  const containerStyle = {
    position: 'relative' as const,
    ...(height ? { height, flex: undefined } : {}),
    ...(width ? { width } : {}),
  };

  return (
    <View className="flex-1 rounded-xl border border-slate-200 overflow-hidden bg-white" style={containerStyle}>
      <ReactSignatureCanvas
        ref={signatureRef}
        penColor="rgba(15, 23, 42, 1)"
        canvasProps={{
          style: { width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }
        }}
        backgroundColor="rgb(255,255,255)"
        clearOnResize={false}
        onBegin={onBegin}
        onEnd={onEnd}
      />
    </View>
  );
});

SignaturePad.displayName = 'SignaturePad';
