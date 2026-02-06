import React from 'react';
import { Text, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

export const Button = ({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  className = '',
  textStyle = '',
}) => {
  const getColors = () => {
    switch (variant) {
      case 'secondary':
        return ['#22d3ee', '#3b82f6']; // Cyan -> Blue
      case 'tertiary': // <--- NEW VARIANT (Purple for Bots)
        return ['#c084fc', '#7e22ce']; // Purple-400 -> Purple-700
      case 'danger':
        return ['#f87171', '#dc2626'];
      default:
        return ['#facc15', '#eab308']; // Yellow -> Amber (Primary)
    }
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.9}
      // 1. CONTAINER = THE SHADOW
      // We make the container Black and Self-Center.
      // 'mt-1 ml-1' compensates for the shift so the button visually stays centered.
      className={`ml-1 mt-1 self-center rounded-full bg-black ${disabled ? 'opacity-60' : ''} ${className}`}>
      {/* 2. FACE = THE CONTENT */}
      {/* We translate it -4px Up and -4px Left. */}
      {/* This exposes the Black Container on the Bottom-Right, creating the perfect shadow. */}
      <LinearGradient
        colors={getColors()}
        className="min-w-[140px] items-center justify-center overflow-hidden rounded-full border-2 border-black px-10 py-4"
        style={{ transform: [{ translateX: -4 }, { translateY: -4 }] }}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}>
        <Text
          className={`text-center text-xl font-black uppercase tracking-widest text-white ${textStyle}`}
          style={{
            textShadowColor: 'rgba(0,0,0,0.2)',
            textShadowOffset: { width: 1, height: 1 },
            textShadowRadius: 1,
          }}>
          {title}
        </Text>
      </LinearGradient>
    </TouchableOpacity>
  );
};
