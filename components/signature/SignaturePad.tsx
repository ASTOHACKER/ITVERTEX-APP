import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { DimensionValue, StyleSheet, View } from 'react-native';
import SignatureCanvas, { SignatureViewRef } from 'react-native-signature-canvas';

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

const canvasStyle = `
  .m-signature-pad {
    box-shadow: none;
    border: none;
    height: 100%;
    margin: 0;
    padding: 0;
  }

  .m-signature-pad--body {
    border: none;
    height: 100%;
    margin: 0;
  }

  .m-signature-pad--footer {
    display: none;
  }

  body, html {
    height: 100%;
    margin: 0;
    overflow: hidden;
    padding: 0;
    width: 100%;
  }

  canvas {
    touch-action: none;
  }
`;

/**
 * Android/iOS signature surface backed by WebView's proven canvas renderer.
 * It exports a real PNG data URI, suitable for previewing and uploading.
 */
export const SignaturePad = forwardRef<SignaturePadRef, Props>(
  ({ onOK, onEmpty, onBegin, onEnd, onError, height, width }, ref) => {
    const signatureRef = useRef<SignatureViewRef>(null);

    useImperativeHandle(ref, () => ({
      clear: () => signatureRef.current?.clearSignature(),
      undo: () => signatureRef.current?.undo(),
      save: () => signatureRef.current?.readSignature(),
    }));

    const containerStyle = {
      ...styles.container,
      ...(height ? { height, flex: undefined } : {}),
      ...(width ? { width } : {}),
    };

    return (
      <View style={containerStyle}>
        <SignatureCanvas
          ref={signatureRef}
          autoClear={false}
          backgroundColor="#ffffff"
          imageType="image/png"
          maxWidth={2.5}
          minWidth={1}
          onBegin={onBegin}
          onEmpty={onEmpty}
          onEnd={onEnd}
          onError={onError}
          onOK={onOK}
          penColor="#0f172a"
          scrollable={false}
          showsVerticalScrollIndicator={false}
          trimWhitespace
          webStyle={canvasStyle}
          webviewContainerStyle={styles.webview}
          webviewProps={{
            bounces: false,
            cacheEnabled: false,
            nestedScrollEnabled: false,
            overScrollMode: 'never',
            scrollEnabled: false,
            showsVerticalScrollIndicator: false,
          }}
        />
      </View>
    );
  }
);

SignaturePad.displayName = 'SignaturePad';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
  webview: {
    flex: 1,
  },
});
