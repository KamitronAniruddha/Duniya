
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Plus, SendHorizontal, Smile, History, Ghost, Zap, Pizza, Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface MessageInputProps {
  onSendMessage: (content: string) => void;
  inputRef?: React.RefObject<HTMLInputElement>;
}

const EMOJI_CATEGORIES = [
  {
    id: "recent",
    icon: <History className="h-4 w-4" />,
    label: "Recent",
    emojis: []
  },
  {
    id: "smileys",
    icon: <Smile className="h-4 w-4" />,
    label: "Smileys",
    emojis: ["😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "😊", "😇", "🙂", "🙃", "😉", "😌", "😍", "🥰", "😘", "😗", "😙", "😚", "😋", "😛", "😝", "😜", "🤪", "🤨", "🧐", "🤓", "😎", "🤩", "🥳", "😏", "😒", "😞", "😔", "😟", "😕", "🙁", "☹️", "😮", "😯", "😲", "😳", "🥺", "😦", "😧", "😨", "😰", "😥", "😢", "😭", "😱", "😖", "😣", "😞", "😓", "😩", "😫", "🥱", "😤", "😡", "😠", "🤬", "😈", "👿", "💀", "☠️", "💩", "🤡", "👹", "👺", "👻", "👽", "👾", "🤖"]
  },
  {
    id: "animals",
    icon: <Ghost className="h-4 w-4" />,
    label: "Animals",
    emojis: ["🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼", "🐨", "🐯", "🦁", "🐮", "🐷", "🐽", "🐸", "🐵", "🙈", "🙉", "🙊", "🐒", "🐔", "🐧", "🐦", "🐤", "🐣", "🐥", "🦆", "🦅", "🦉", "🦇", "🐺", "🐗", "🐴", "🦄", "🐝", "🐛", "🦋", "🐌", "🐞", "🐜", "🦟", "🦗", "🕷", "🕸", "🦂", "🐢", "🐍", "🦎", "🦖", "🦕", "🐙", "🦑", "🦐", "🦞", "🦀", "🐡", "🐠", "🐟", "🐬", "🐳", "🐋", "🦈", "🐊", "🐅", "🐆", "🦓", "🦍", "🦧", "🐘", "🦛", "🦏", "🐪", "🐫", "🦒", "🦘", "🐃", "🐂", "🐄", "🐎", "🐖", "🐏", "🐑", "🐐", "🦌", "🐕", "🐩", "🦮", "🐕‍🦺", "🐈", "🐓", "🦃", "🦚", "🦜", "🦢", "🦩", "🕊", "🐇", "🦝", "🦨", "🦡", "🦦", "🦥", "🐁", "🐀", "🐿", "🦔"]
  },
  {
    id: "food",
    icon: <Pizza className="h-4 w-4" />,
    label: "Food",
    emojis: ["🍏", "🍎", "🍐", "🍊", "🍋", "🍌", "🍉", "🍇", "🍓", "🍈", "🍒", "🍑", "🥭", "🍍", "🥥", "🥝", "🍅", "🍆", "🥑", "🥦", "🥬", "🥒", "🌶", "🌽", "🥕", "🧄", "🧅", "🥔", "🍠", "🥐", "🥯", "🍞", "🥖", "🥨", "🧀", "🥚", "🍳", "バター", "🥞", "🧇", "🥓", "🥩", "🍗", "🍖", "🦴", "🌭", "🍔", "🍟", "🍕", "🥪", "🥙", "🧆", "タック", "🌯", "🥗", "🥘", "スパ", "ラーメン", "🍲", "カレ", "スシ", "ベント", "ギョ", "カキ", "エビ", "ムス", "ライス", "セン", "カマ", "クキ", "ゲッ", "おで", "ダン", "カキ", "アイ", "ソフ", "パイ", "カプ", "ショ", "デコ", "プリ", "キャン", "アメ", "チョ", "ポプ", "ドナ", "クッ", "クリ", "ピナ", "ミツ", "ミル", "コヒ", "お茶", "マテ", "サケ", "ビル", "カン", "チン", "ワイ", "ウィ", "カク", "トロ", "ソー", "ジュ", "氷"]
  },
  {
    id: "activities",
    icon: <Zap className="h-4 w-4" />,
    label: "Activities",
    emojis: ["⚽️", "🏀", "🏈", "⚾️", "🥎", "🎾", "🏐", "🏉", "🥏", "🎱", "🪀", "🏓", "バド", "ホッ", "フィ", "ラッ", "クリ", "ゴル", "カイト", "弓", "釣り", "潜水", "ボク", "カラ", "スケ", "スキ", "ソリ", "カー", "スケ", "ロラ", "トレ", "レス", "体操", "バス", "フェ", "ハン", "ゴル", "競馬", "ヨガ", "サフ", "水泳", "水球", "ボト", "登山", "マウ", "自転", "トロ", "金メ", "銀メ", "銅メ", "メダ", "勲章", "リボ", "チケ", "招待", "サー", "劇場", "絵画", "パレ", "ぬい", "毛糸", "マイ", "ヘッ", "音符", "ピア", "ドラ", "ギタ", "バイ", "サイ", "チェ", "的", "ボウ", "ゲム", "スロ", "パズ"]
  },
  {
    id: "symbols",
    icon: <Heart className="h-4 w-4" />,
    label: "Symbols",
    emojis: ["❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔", "❣️", "💕", "💞", "💓", "💗", "💖", "💘", "💝", "💟", "☮️", "✝️", "☪️", "🕉", "☸️", "✡️", "🔯", "🕎", "☯️", "☦️", "🛐", "⛎", "♈️", "♉️", "♊️", "♋️", "♌️", "♍️", "♎️", "♏️", "♐️", "♑️", "♒️", "♓️", "🆔", "⚛️", "🉑", "☢️", "☣️", "📴", "📳", "🈶", "🈚️", "🈸", "🈺", "🈷️", "✴️", "🆚", "💮", "🉐", "㊙️", "㊗️", "🈴", "🈵", "🈹", "🈲", "🅰️", "🅱️", "🆑", "🅾️", "🆘", "❌", "⭕️", "🛑", "⛔️", "📛", "🚫", "💯", "💢", "♨️", "🚷", "🚯", "🚳", "🚱", "🔞", "📵", "🚭", "❗️", "❕", "❓", "❔", "‼️", "⁉️", "🔅", "🔆", "〽️", "⚠️", "🚸", "🔱", "⚜️", "🔰", "♻️", "✅", "🈯️", "💹", "❇️", "✳️", "❎", "🌐", "💠", "Ⓜ️", "🌀", "💤", "🏧", "🚾", "♿️", "🅿️", "🈳", "🈂️", "🛂", "🛃", "🛄", "🛅", "🚹", "🚺", "🚼", "⚧", "🚻", "🚮", "🎦", "📶", "🈁", "🆖", "🆗", "🆙", "🆒", "🆕", "🆓", "0️⃣", "1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟", "🔢", "#️⃣", "*️⃣", "⏏️", "▶️", "⏸", "⏯", "⏹", "⏺", "⏭", "⏮", "⏩", "⏪", "⏫", "⏬", "◀️", "🔼", "🔽", "➡️", "⬅️", "⬆️", "⬇️", "↗️", "↘️", "↙️", "↖️", "↕️", "↔️", "↪️", "↩️", "⤴️", "⤵️", "🔀", "🔁", "🔂", "🔄", "🔃", "🎵", "🎶", "➕", "➖", "➗", "✖️", "♾", "💲", "💱", "™️", "©️", "®️", "👁‍🗨", "🔚", "🔙", "🔛", "🔝", "🔜", "〰️", "➰", "➿", "✔️", "☑️", "🔘", "🔴", "🟠", "🟡", "🟢", "🔵", "🟣", "⚫️", "⚪️", "🟤", "🔺", "🔻", "🔸", "🔹", "🔶", "🔷", "🔳", "🔲", "🏁", "🚩", "🎌", "🏴", "🏳️", "🏳️‍🌈", "🏳️‍⚧️", "🏴‍☠️"]
  }
];

export function MessageInput({ onSendMessage, inputRef }: MessageInputProps) {
  const [text, setText] = useState("");
  const [recentEmojis, setRecentEmojis] = useState<string[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem("recent-emojis");
    if (saved) {
      try {
        setRecentEmojis(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse recent emojis");
      }
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim()) {
      onSendMessage(text);
      setText("");
    }
  };

  const addEmoji = (emoji: string) => {
    setText(prev => prev + emoji);
    const updated = [emoji, ...recentEmojis.filter(e => e !== emoji)].slice(0, 40);
    setRecentEmojis(updated);
    localStorage.setItem("recent-emojis", JSON.stringify(updated));
  };

  return (
    <div className="p-4 bg-white border-t shrink-0 w-full">
      <form onSubmit={handleSubmit} className="flex items-center gap-2 max-w-5xl mx-auto">
        <Button variant="ghost" size="icon" type="button" className="shrink-0 text-muted-foreground hidden sm:flex">
          <Plus className="h-5 w-5" />
        </Button>
        
        <div className="flex-1 relative">
          <input 
            ref={inputRef}
            placeholder="Write a message..." 
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="w-full bg-gray-50 border-none rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary/20 transition-all"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center">
            <Popover>
              <PopoverTrigger asChild>
                <button type="button" className="text-muted-foreground hover:text-primary transition-colors p-1">
                  <Smile className="h-4 w-4" />
                </button>
              </PopoverTrigger>
              <PopoverContent side="top" align="end" className="w-80 p-0 overflow-hidden">
                <Tabs defaultValue="smileys" className="w-full">
                  <TabsList className="w-full justify-start rounded-none border-b bg-gray-50/50 p-0 h-10 overflow-x-auto overflow-y-hidden custom-scrollbar">
                    {EMOJI_CATEGORIES.map((cat) => (
                      <TabsTrigger 
                        key={cat.id} 
                        value={cat.id} 
                        className="flex-1 rounded-none data-[state=active]:bg-white data-[state=active]:border-b-2 data-[state=active]:border-primary"
                      >
                        {cat.icon}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                  
                  {EMOJI_CATEGORIES.map((cat) => (
                    <TabsContent key={cat.id} value={cat.id} className="m-0">
                      <ScrollArea className="h-64 p-2">
                        <div className="p-1">
                          <h4 className="text-[10px] font-bold uppercase text-muted-foreground mb-2 px-1">{cat.label}</h4>
                          <div className="grid grid-cols-8 gap-1">
                            {(cat.id === 'recent' ? recentEmojis : cat.emojis).map((emoji, idx) => (
                              <button
                                key={`${cat.id}-${idx}`}
                                type="button"
                                onClick={() => addEmoji(emoji)}
                                className="text-xl hover:bg-gray-100 rounded aspect-square flex items-center justify-center transition-colors"
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                        </div>
                      </ScrollArea>
                    </TabsContent>
                  ))}
                </Tabs>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <Button 
          type="submit" 
          size="icon" 
          disabled={!text.trim()}
          className={cn(
            "rounded-xl h-10 w-10 shrink-0 transition-all",
            text.trim() ? "bg-primary shadow-md scale-100" : "bg-gray-200 text-gray-400 scale-95"
          )}
        >
          <SendHorizontal className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
