import { useState, useRef } from 'react';
import { StyleSheet, Text, View, Pressable, ScrollView, Image, Animated } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useFonts, Outfit_400Regular, Outfit_600SemiBold, Outfit_700Bold } from '@expo-google-fonts/outfit';
import CropModal from '../components/CropModal';

const ANIMALS = [
  { id: 'cat',    emoji: '🐱', name: 'Cat'    },
  { id: 'dog',    emoji: '🐶', name: 'Dog'    },
  { id: 'fox',    emoji: '🦊', name: 'Fox'    },
  { id: 'deer',   emoji: '🦌', name: 'Deer'   },
  { id: 'rabbit', emoji: '🐰', name: 'Rabbit' },
];

const FILTERS = [
  { id: 'clay',    emoji: '🪆', name: '3D Clay',   pro: false },
  { id: 'plushie', emoji: '🧸', name: 'Plushie',   pro: true  },
  { id: 'anime',   emoji: '✨', name: 'Y2K Anime', pro: true  },
];

export default function HomeScreen() {
  const [selectedAnimal, setSelectedAnimal] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('clay');
  const [rawPhoto,       setRawPhoto]       = useState<string | null>(null);
  const [croppedPhoto,   setCroppedPhoto]   = useState<string | null>(null);
  const [showCrop,       setShowCrop]       = useState(false);
  const isPro = false;

  const [fontsLoaded] = useFonts({
    Outfit_400Regular,
    Outfit_600SemiBold,
    Outfit_700Bold,
  });

  const bounceAnims = useRef(ANIMALS.map(() => new Animated.Value(1))).current;

  const isReady = croppedPhoto && selectedAnimal && selectedFilter;

  const handleAnimalPress = (id: string, index: number) => {
    setSelectedAnimal(id);
    Animated.sequence([
      Animated.spring(bounceAnims[index], { toValue: 1.25, useNativeDriver: true, speed: 60, bounciness: 8 }),
      Animated.spring(bounceAnims[index], { toValue: 1,    useNativeDriver: true, speed: 20, bounciness: 4 }),
    ]).start();
  };

  const pickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { alert('Permission needed!'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
    });
    if (!result.canceled) {
      setRawPhoto(result.assets[0].uri);
      setCroppedPhoto(null);
      setShowCrop(true);
    }
  };

  if (!fontsLoaded) return null;

  const f = (weight: 'regular' | 'semi' | 'bold') => ({
    fontFamily: weight === 'bold' ? 'Outfit_700Bold'
              : weight === 'semi' ? 'Outfit_600SemiBold'
              : 'Outfit_400Regular'
  });

  return (
    <ScrollView style={styles.container}>

      <View style={styles.header}>
        <Text style={[styles.title, f('bold')]}>🐾 Animal Era</Text>
        <Text style={[styles.subtitle, f('regular')]}>Step into your animal era ✨</Text>
      </View>

      <Pressable
        style={({ pressed }) => [styles.uploadBox, pressed && styles.pressed]}
        onPress={pickPhoto}
      >
        {croppedPhoto ? (
          <>
            <Image source={{ uri: croppedPhoto }} style={styles.previewImage} resizeMode="contain" />
            <Text style={[styles.changeText, f('regular')]}>Tap to change</Text>
          </>
        ) : (
          <>
            <Text style={styles.uploadIcon}>📷</Text>
            <Text style={[styles.uploadText, f('semi')]}>Drop a cute pic here</Text>
          </>
        )}
      </Pressable>

      <Text style={[styles.sectionTitle, f('bold')]}>Pick your animal</Text>
      <View style={styles.animalGrid}>
        {ANIMALS.map((animal, index) => (
          <Pressable
            key={animal.id}
            style={[
              styles.animalCard,
              selectedAnimal === animal.id && styles.animalCardSelected,
            ]}
            onPress={() => handleAnimalPress(animal.id, index)}
          >
            <Animated.Text style={[
              styles.animalEmoji,
              { transform: [{ scale: bounceAnims[index] }] }
            ]}>
              {animal.emoji}
            </Animated.Text>
          </Pressable>
        ))}
      </View>

      <Text style={[styles.sectionTitle, f('bold')]}>Pick your vibe</Text>
      <View style={styles.filterGrid}>
        {FILTERS.map((filter) => {
          const locked     = filter.pro && !isPro;
          const isSelected = selectedFilter === filter.id;
          return (
            <Pressable
              key={filter.id}
              style={({ pressed }) => [
                styles.filterCard,
                isSelected && styles.filterCardSelected,
                locked && styles.filterCardLocked,
                pressed && !locked && styles.pressed
              ]}
              onPress={() => {
                if (locked) { alert('✨ Upgrade to Pro to unlock this style!'); return; }
                setSelectedFilter(filter.id);
              }}
            >
              <Text style={styles.filterEmoji}>{filter.emoji}</Text>
              <Text style={[styles.filterName, f('semi'), isSelected && styles.filterNameSelected]}>
                {filter.name}
              </Text>
              {locked && (
                <View style={styles.proBadge}>
                  <Text style={[styles.proBadgeText, f('bold')]}>PRO</Text>
                </View>
              )}
              {isSelected && !locked && (
                <View style={styles.selectedBadge}>
                  <Text style={styles.selectedBadgeText}>✓</Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>

      <View style={{ marginHorizontal: 20, marginTop: 4 }}>
        <Pressable
          style={({ pressed }) => [
            styles.generateButton,
            !isReady && styles.generateButtonDisabled,
            pressed && !!isReady && styles.generateButtonPressed
          ]}
          disabled={!isReady}
        >
          <Text style={[styles.generateText, f('bold')]}>Work your magic ✨</Text>
        </Pressable>
      </View>

      {!isReady && (
        <Text style={[styles.hint, f('regular')]}>
          {!croppedPhoto    ? '📷 Upload your selfie to get started'
            : !selectedAnimal ? '🐾 Pick your animal'
            : '✨ Choose your vibe!'}
        </Text>
      )}

      {rawPhoto && (
        <CropModal
          visible={showCrop}
          imageUri={rawPhoto}
          onCrop={(uri) => { setCroppedPhoto(uri); setShowCrop(false); }}
          onCancel={() => setShowCrop(false)}
        />
      )}

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:              { flex: 1, backgroundColor: '#F8F4FF' },
  header:                 { alignItems: 'center', paddingTop: 60, paddingBottom: 30 },
  title:                  { fontSize: 28, color: '#3D2C8D' },
  subtitle:               { fontSize: 16, color: '#9B89C4', marginTop: 6, alignSelf: 'flex-end', paddingRight: 1170 },
  uploadBox:              { margin: 20, padding: 36, backgroundColor: '#fff', borderRadius: 20, alignItems: 'center', borderWidth: 2, borderColor: '#C4B5F4', borderStyle: 'dashed' },
  uploadIcon:             { fontSize: 40 },
  uploadText:             { fontSize: 16, color: '#3D2C8D', marginTop: 10 },
  previewImage: { width: 140, height: 140, borderRadius: 12, resizeMode: 'contain', backgroundColor: '#F0EAFF' },
  changeText:             { fontSize: 12, color: '#9B89C4', marginTop: 8 },

  sectionTitle:           { fontSize: 16, color: '#3D2C8D', marginLeft: 20, marginBottom: 12 },

  animalGrid:             { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 10, marginBottom: 24 },
  animalCard:             { width: '18%', backgroundColor: '#fff', borderRadius: 16, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: '#E8DFFF' },
  animalCardSelected:     { backgroundColor: '#6C48C5', borderColor: '#6C48C5' },
  animalEmoji:            { fontSize: 28 },

  filterGrid:             { flexDirection: 'row', paddingHorizontal: 16, gap: 10, marginBottom: 24 },
  filterCard:             { flex: 1, backgroundColor: '#fff', borderRadius: 20, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#E8DFFF', position: 'relative' },
  filterCardSelected:     { backgroundColor: '#6C48C5', borderColor: '#6C48C5' },
  filterCardLocked:       { opacity: 0.5 },
  filterEmoji:            { fontSize: 32, marginBottom: 8 },
  filterName:             { fontSize: 13, color: '#3D2C8D' },
  filterNameSelected:     { color: '#fff' },
  proBadge:               { position: 'absolute', top: 8, right: 8, backgroundColor: '#FFD700', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  proBadgeText:           { fontSize: 9, color: '#7A5800' },
  selectedBadge:          { position: 'absolute', top: 8, right: 8, backgroundColor: '#fff', borderRadius: 10, width: 20, height: 20, alignItems: 'center', justifyContent: 'center' },
  selectedBadgeText:      { fontSize: 11, color: '#6C48C5' },

  generateButton:         { backgroundColor: '#6C48C5', padding: 18, borderRadius: 16, alignItems: 'center' },
  generateButtonDisabled: { backgroundColor: '#C4B5F4' },
  generateButtonPressed:  { opacity: 0.8 },
  generateText:           { color: '#fff', fontSize: 16 },
  hint:                   { textAlign: 'center', color: '#9B89C4', fontSize: 13, marginBottom: 30, marginTop: 12 },
  pressed:                { opacity: 0.7, transform: [{ scale: 0.97 }] },
});