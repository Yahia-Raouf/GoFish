import React from 'react';
import { Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

/**
 * Reusable Card Component
 * Renders a playing card based on the standard code (e.g., 'AH', '10S', '4D').
 * * @param {string} card - The card code (e.g. '7H' for 7 of Hearts)
 * @param {string} size - 'sm', 'md', 'lg', 'xl' (Default: 'lg')
 * @param {string} className - Extra Tailwind classes
 * @param {object} style - Extra inline styles
 */
export const CardVisual = ({ card = '??', size = 'lg', className = '', style = {} }) => {
  // 1. Parse Rank & Suit
  // "10H" -> rank: "10", suit: "H"
  // "KD"  -> rank: "K",  suit: "D"
  const rank = card.length === 3 ? card.slice(0, 2) : card.slice(0, 1);
  const suitCode = card.slice(-1);

  // 2. Suit Config
  const getSuitData = (code) => {
    switch (code) {
      case 'H':
        return { name: 'cards-heart', color: '#dc2626' }; // Red
      case 'D':
        return { name: 'cards-diamond', color: '#dc2626' }; // Red
      case 'C':
        return { name: 'cards-club', color: '#0f172a' }; // Slate-900
      case 'S':
        return { name: 'cards-spade', color: '#0f172a' }; // Slate-900
      case '?':
        return { name: 'help-circle', color: '#94a3b8' }; // Mystery
      default:
        return { name: 'cards-playing-outline', color: '#94a3b8' };
    }
  };

  const { name: iconName, color } = getSuitData(suitCode);

  // 3. Size Config (Matches GameTitle.jsx)
  const getSizes = () => {
    switch (size) {
      case 'sm':
        return {
          box: 'w-10 h-14',
          text: 'text-xl',
          iconSize: 10,
          padding: 1,
        };
      case 'md':
        return {
          box: 'w-14 h-20',
          text: 'text-2xl',
          iconSize: 14,
          padding: 2,
        };
      case 'xl':
        return {
          box: 'w-24 h-36',
          text: 'text-5xl',
          iconSize: 24,
          padding: 4,
        };
      default: // lg
        return {
          box: 'w-20 h-28',
          text: 'text-4xl',
          iconSize: 20,
          padding: 2,
        };
    }
  };

  const s = getSizes();

  return (
    <View
      style={style}
      className={`border-2 border-gray-200 bg-white ${s.box} ${className} items-center justify-center rounded-xl shadow-lg shadow-black/40`}>
      {/* Top Left Icon */}
      <View className="absolute left-1 top-1">
        <MaterialCommunityIcons name={iconName} size={s.iconSize} color={color} />
      </View>

      {/* Center Rank */}
      <Text className={`${s.text} font-black tracking-tighter`} style={{ color }}>
        {rank}
      </Text>

      {/* Bottom Right Icon (Rotated) */}
      <View className="absolute bottom-1 right-1 rotate-180">
        <MaterialCommunityIcons name={iconName} size={s.iconSize} color={color} />
      </View>
    </View>
  );
};
