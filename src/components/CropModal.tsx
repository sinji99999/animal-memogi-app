import { useState, useRef } from 'react';
import { View, Image, Pressable, Text, StyleSheet, PanResponder, Platform } from 'react-native';
import * as ImageManipulator from 'expo-image-manipulator';

const IMG_SIZE = 400;

// 실제 이미지가 contain 모드로 표시될 때의 위치/크기 계산
const getImageBounds = (naturalW: number, naturalH: number) => {
  const ratio = naturalW / naturalH;
  let displayW, displayH, offsetX, offsetY;
  if (ratio > 1) {
    displayW = IMG_SIZE;
    displayH = IMG_SIZE / ratio;
    offsetX  = 0;
    offsetY  = (IMG_SIZE - displayH) / 2;
  } else {
    displayH = IMG_SIZE;
    displayW = IMG_SIZE * ratio;
    offsetX  = (IMG_SIZE - displayW) / 2;
    offsetY  = 0;
  }
  return { displayW, displayH, offsetX, offsetY };
};

const cropOnWeb = (
  imageUri: string,
  x: number, y: number,
  w: number, h: number
): Promise<string> =>
  new Promise((resolve, reject) => {
    const img = new window.Image();
    if (!imageUri.startsWith('blob:') && !imageUri.startsWith('data:')) {
      img.crossOrigin = 'anonymous';
    }
    img.onload = () => {
      const bounds  = getImageBounds(img.naturalWidth, img.naturalHeight);
      const scaleX  = img.naturalWidth  / bounds.displayW;
      const scaleY  = img.naturalHeight / bounds.displayH;

      // offset 제거 후 실제 픽셀 좌표 계산
      const cropX = Math.round(Math.max(0, (x - bounds.offsetX) * scaleX));
      const cropY = Math.round(Math.max(0, (y - bounds.offsetY) * scaleY));
      const cropW = Math.round(Math.min(w * scaleX, img.naturalWidth  - cropX));
      const cropH = Math.round(Math.min(h * scaleY, img.naturalHeight - cropY));

      if (cropW <= 0 || cropH <= 0) { reject('Invalid crop area'); return; }

      const canvas  = document.createElement('canvas');
      canvas.width  = cropW;
      canvas.height = cropH;
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject('Canvas error'); return; }
      ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
      resolve(canvas.toDataURL('image/jpeg', 0.92));
    };
    img.onerror = () => reject('Image load failed');
    img.src = imageUri;
  });

export default function CropModal({ visible, imageUri, onCrop, onCancel }: {
  visible:  boolean;
  imageUri: string;
  onCrop:   (uri: string) => void;
  onCancel: () => void;
}) {
  const [box, setBox]               = useState({ x: 0, y: 0, w: 0, h: 0 });
  const [imgSize, setImgSize]       = useState({ width: 1000, height: 1000 });
  const [isDragging, setIsDragging] = useState(false);
  const start                       = useRef({ x: 0, y: 0 });
  const imgSizeSet                  = useRef(false);

  const pan = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder:  () => true,
    onPanResponderGrant: (e) => {
      const { locationX: x, locationY: y } = e.nativeEvent;
      start.current = { x, y };
      setBox({ x, y, w: 0, h: 0 });
      setIsDragging(true);
    },
    onPanResponderMove: (e) => {
      const { locationX: x, locationY: y } = e.nativeEvent;
      setBox({
        x: Math.min(start.current.x, x),
        y: Math.min(start.current.y, y),
        w: Math.abs(x - start.current.x),
        h: Math.abs(y - start.current.y),
      });
    },
    onPanResponderRelease: () => setIsDragging(false),
  });

  const handleCrop = async () => {
    if (box.w < 10 || box.h < 10) {
      alert('Please drag to select an area first!');
      return;
    }
    try {
      let uri: string;
      if (Platform.OS === 'web') {
        uri = await cropOnWeb(imageUri, box.x, box.y, box.w, box.h);
      } else {
        const bounds = getImageBounds(imgSize.width, imgSize.height);
        const scaleX = imgSize.width  / bounds.displayW;
        const scaleY = imgSize.height / bounds.displayH;
        const result = await ImageManipulator.manipulateAsync(
          imageUri,
          [{ crop: {
            originX: Math.max(0, (box.x - bounds.offsetX) * scaleX),
            originY: Math.max(0, (box.y - bounds.offsetY) * scaleY),
            width:   Math.min(box.w * scaleX, imgSize.width),
            height:  Math.min(box.h * scaleY, imgSize.height),
          }}],
          { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG }
        );
        uri = result.uri;
      }
      onCrop(uri);
    } catch (e) {
      alert('Crop failed: ' + e);
    }
  };

  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <View style={styles.container}>

        <View style={styles.topBar}>
          <Text style={styles.title}>Drag to select area</Text>
          <Text style={styles.hint}>
            {isDragging ? '🟣 Selecting...'
              : box.w > 10 ? '✅ Area selected! Tap Crop'
              : 'Draw a box around the part you want'}
          </Text>
        </View>

        <View style={styles.imageWrapper} {...pan.panHandlers}>
          <Image
            source={{ uri: imageUri }}
            style={styles.image}
            resizeMode="contain"
            onLoad={(e) => {
              if (imgSizeSet.current) return;
              imgSizeSet.current = true;
              const w = e?.nativeEvent?.source?.width  || 1000;
              const h = e?.nativeEvent?.source?.height || 1000;
              setImgSize({ width: w, height: h });
            }}
          />
          {box.w > 0 && (
            <>
              <View style={[styles.dark, { top: 0,             left: 0,             width: IMG_SIZE,                height: box.y                   }]} />
              <View style={[styles.dark, { top: box.y + box.h, left: 0,             width: IMG_SIZE,                height: IMG_SIZE - box.y - box.h }]} />
              <View style={[styles.dark, { top: box.y,         left: 0,             width: box.x,                   height: box.h                   }]} />
              <View style={[styles.dark, { top: box.y,         left: box.x + box.w, width: IMG_SIZE - box.x - box.w, height: box.h                  }]} />
              <View style={[styles.selectionBox, { left: box.x, top: box.y, width: box.w, height: box.h }]} />
            </>
          )}
        </View>

        <View style={styles.bottomBar}>
          <Pressable
            style={({ pressed }) => [styles.cancelBtn, pressed && { opacity: 0.7 }]}
            onPress={onCancel}
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
          <Pressable
            style={[styles.cropBtn, box.w < 10 && styles.cropBtnDisabled]}
            onPress={handleCrop}
            disabled={box.w < 10}
          >
            <Text style={styles.cropText}>Crop ✂️</Text>
          </Pressable>
        </View>

      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay:         { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 999, justifyContent: 'center', alignItems: 'center' },
  container:       { backgroundColor: '#F8F4FF', borderRadius: 24, padding: 24, alignItems: 'center', gap: 16 },
  topBar:          { alignItems: 'center' },
  title:           { fontSize: 20, fontWeight: 'bold', color: '#3D2C8D', marginBottom: 4 },
  hint:            { fontSize: 13, color: '#9B89C4', textAlign: 'center' },
  imageWrapper:    { width: IMG_SIZE, height: IMG_SIZE, borderRadius: 12, overflow: 'hidden', backgroundColor: '#eee' },
  image:           { width: IMG_SIZE, height: IMG_SIZE },
  dark:            { position: 'absolute', backgroundColor: 'rgba(0,0,0,0.5)' },
  selectionBox:    { position: 'absolute', borderWidth: 2, borderColor: '#fff' },
  bottomBar:       { flexDirection: 'row', gap: 12, width: IMG_SIZE },
  cancelBtn:       { flex: 1, padding: 14, borderRadius: 12, borderWidth: 1.5, borderColor: '#C4B5F4', alignItems: 'center' },
  cancelText:      { color: '#6C48C5', fontWeight: 'bold' },
  cropBtn:         { flex: 1, padding: 14, borderRadius: 12, backgroundColor: '#6C48C5', alignItems: 'center' },
  cropBtnDisabled: { backgroundColor: '#C4B5F4' },
  cropText:        { color: '#fff', fontWeight: 'bold' },
});