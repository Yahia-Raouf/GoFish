import React from 'react';
import { Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const SingleCard = ({ text, rotate, color, size, zIndex, iconName = 'cards-spade' }) => {
  return (
    <View
      className={`border-2 border-gray-200 bg-white ${size.card} ${rotate} ${zIndex} items-center justify-center rounded-xl shadow-lg shadow-black/40`}>
      <View className="absolute left-1 top-1">
        <MaterialCommunityIcons name={iconName} size={size.icon} color={color} />
      </View>

      <Text className={`${size.text} font-black tracking-tighter`} style={{ color }}>
        {text}
      </Text>

      <View className="absolute bottom-1 right-1 rotate-180">
        <MaterialCommunityIcons name={iconName} size={size.icon} color={color} />
      </View>
    </View>
  );
};

export const GameTitle = ({ size = 'lg', className = '' }) => {
  const getSizes = () => {
    switch (size) {
      case 'sm':
        return { card: 'w-10 h-14', text: 'text-xl', icon: 10, gap: '-ml-2', marginY: 'mt-0' };
      case 'md':
        return { card: 'w-14 h-20', text: 'text-2xl', icon: 14, gap: '-ml-3', marginY: 'mt-1' };
      case 'xl':
        return { card: 'w-24 h-36', text: 'text-5xl', icon: 24, gap: '-ml-5', marginY: 'mt-4' };
      default: // lg
        return { card: 'w-20 h-28', text: 'text-4xl', icon: 20, gap: '-ml-4', marginY: 'mt-3' };
    }
  };

  const s = getSizes();

  return (
    <View className={`flex-row items-center justify-center pt-4 ${className}`}>
      {/* CARD 1: GO */}
      {/* HIGHEST Z-INDEX (z-30). It sits on top of everything. */}
      <SingleCard
        text="GO"
        rotate="-rotate-12"
        size={s}
        color="#1e3a8a"
        zIndex="z-30"
        iconName="cards-spade"
      />

      {/* CARD 2: FI */}
      {/* MIDDLE Z-INDEX (z-20). Sits under GO, but on top of SH. */}
      <View className={`${s.gap} z-20 -mt-6`}>
        <SingleCard
          text="FI"
          rotate="-rotate-3"
          size={s}
          color="#ca8a04"
          zIndex="z-20"
          iconName="cards-diamond"
        />
      </View>

      {/* CARD 3: SH */}
      {/* LOWEST Z-INDEX (z-10). Sits under everything. */}
      <View className={`${s.gap} z-10`}>
        <SingleCard
          text="SH"
          rotate="rotate-12"
          size={s}
          color="#ca8a04"
          zIndex="z-10"
          iconName="cards-club"
        />
      </View>
    </View>
  );
};
