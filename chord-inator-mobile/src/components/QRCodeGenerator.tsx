import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { colors } from '@/constants/colors';
import { nanoid } from '@/utils/nanoid';

interface QRCodeGeneratorProps {
  size?: number;
  onGenerate?: (qrData: string) => void;
}

export const QRCodeGenerator: React.FC<QRCodeGeneratorProps> = ({
  size = 200,
  onGenerate
}) => {
  // Generate a unique ID for the QR code
  const qrData = nanoid(32);

  // Notify parent component when QR code is generated
  React.useEffect(() => {
    if (onGenerate) {
      onGenerate(qrData);
    }
  }, [qrData, onGenerate]);

  return (
    <View style={styles.container}>
      <Pressable 
        style={[styles.qrContainer, { width: size, height: size }]}
        onPress={() => {
          // Generate new QR code on press
          if (onGenerate) {
            onGenerate(nanoid(32));
          }
        }}
      >
        <QRCode
          value={qrData}
          size={size - 20} // Slightly smaller than container to add padding
          backgroundColor={colors.surface}
          color={colors.text}
        />
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  qrContainer: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
}); 