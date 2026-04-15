import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Zap, Target, Trophy, Flame, Star, Heart, Rocket, Coffee } from "lucide-react";
import { cn } from "@/lib/utils";

interface EncouragementPopupProps {
  userName?: string;
  userVertical?: string;
  userRole?: string;
}

const ICONS = [Zap, Target, Trophy, Flame, Star, Heart, Rocket, Coffee];

const ENCOURAGEMENTS = [
  { type: "motivation", messages: [
    "Aaj ka din tera hai, {name}! Target tod de! 🔥",
    "Chal {name}, ek aur call — ek aur deal! 💪",
    "Tu kar sakta/sakti hai {name}! Bus thoda aur push! 🚀",
    "{name}, winners never quit! Let's gooo! 🏆",
    "Coffee break le aur phir full power se kaam kar, {name}! ☕💥",
    "Har call ek opportunity hai, {name}! Miss mat kar! 📞",
    "{name}, picture abhi baaki hai mere dost! 🎬",
    "Apna time aayega, {name}! Actually, aaj hai woh time! ⭐",
  ]},
  { type: "target_push", messages: [
    "🎯 {name}! Target check kar — kitna bacha hai? Chal close kar!",
    "💰 {name}, incentive itne close hai! Bus 1-2 deals aur!",
    "📊 Progress update: {name}, aaj kitne calls kiye? Let's track!",
    "🏅 {name}, top performer ban sakta/sakti hai! Push harder!",
  ]},
  { type: "fun", messages: [
    "😄 {name}, smile karo! Customer ko bhi accha lagega!",
    "🎭 Bollywood style: '{name} ka swag alag hai!' 🕶️",
    "🎵 '{name} {name}... apna kaam banta, bhaad mein jaaye janta!' 😂",
    "💪 {name} = Superstar! Ab dikhao apna talent!",
    "🌟 '{name} zindabad!' — Office ka hero/heroine! 🎉",
  ]},
  { type: "reminder", messages: [
    "⏰ {name}! Follow-up pending hai kya? Check kar le!",
    "📋 {name}, task list dekh — kuch miss toh nahi ho raha?",
    "🔔 {name}, lunch ke baad fresh start — pehle woh pending call kar!",
    "📱 {name}, CRM update kiya? Data fresh rakhna important hai!",
  ]},
];

export function EncouragementPopup({ userName, userVertical, userRole }: EncouragementPopupProps) {
  const isSuperAdmin = !userRole || userRole === "super_admin" || userRole === "admin";
  const [show, setShow] = useState(false);
  const [message, setMessage] = useState("");
  const [IconComp, setIconComp] = useState<typeof Zap>(Zap);

  const cleanName = (userName || "Team").replace(/@.*$/, "").split(/[_.\-]/)[0];
  const displayName = cleanName.charAt(0).toUpperCase() + cleanName.slice(1).toLowerCase();

  const showRandomEncouragement = useCallback(() => {
    const category = ENCOURAGEMENTS[Math.floor(Math.random() * ENCOURAGEMENTS.length)];
    const msg = category.messages[Math.floor(Math.random() * category.messages.length)];
    const icon = ICONS[Math.floor(Math.random() * ICONS.length)];
    setMessage(msg.replace(/\{name\}/g, displayName));
    setIconComp(() => icon);
    setShow(true);
    setTimeout(() => setShow(false), 8000);
  }, [displayName]);

  useEffect(() => {
    if (isSuperAdmin) return;
    
    // Show first popup after 2 minutes
    const initialTimeout = setTimeout(showRandomEncouragement, 2 * 60 * 1000);
    
    // Then every 15 minutes
    const interval = setInterval(showRandomEncouragement, 15 * 60 * 1000);
    
    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, [isSuperAdmin, showRandomEncouragement]);

  if (isSuperAdmin) return null;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: -50, x: 50, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, x: 0, scale: 1 }}
          exit={{ opacity: 0, y: -30, scale: 0.8 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className={cn(
            "fixed top-20 right-6 z-[60] max-w-sm",
            "bg-gradient-to-br from-primary/95 to-primary rounded-2xl",
            "shadow-2xl border border-primary-foreground/20",
            "p-4 pr-10"
          )}
        >
          <button
            onClick={() => setShow(false)}
            className="absolute top-2 right-2 text-primary-foreground/60 hover:text-primary-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
          
          <div className="flex items-start gap-3">
            <motion.div
              initial={{ rotate: -20 }}
              animate={{ rotate: [0, -10, 10, -5, 5, 0] }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="flex-shrink-0 h-10 w-10 rounded-full bg-primary-foreground/20 flex items-center justify-center"
            >
              <IconComp className="h-5 w-5 text-primary-foreground" />
            </motion.div>
            <div>
              <p className="text-sm font-bold text-primary-foreground mb-0.5">
                {displayName}'s AI Manager 🤖
              </p>
              <p className="text-sm text-primary-foreground/90 leading-relaxed">
                {message}
              </p>
            </div>
          </div>
          
          <motion.div
            className="absolute bottom-0 left-0 h-1 bg-primary-foreground/30 rounded-b-2xl"
            initial={{ width: "100%" }}
            animate={{ width: "0%" }}
            transition={{ duration: 8, ease: "linear" }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
