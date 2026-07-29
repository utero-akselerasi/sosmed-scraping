import re
from typing import Optional
from textblob import TextBlob
from Sastrawi.Stemmer.StemmerFactory import StemmerFactory


class SentimentAnalyzer:
    """Simple rule-based sentiment analyzer for Indonesian text"""
    
    def __init__(self):
        # Indonesian stemmer
        factory = StemmerFactory()
        self.stemmer = factory.create_stemmer()
        
        # Positive keywords (Indonesian)
        self.positive_words = {
            'bagus', 'baik', 'suka', 'senang', 'gembira', 'hebat', 'mantap',
            'keren', 'amazing', 'luar biasa', 'sempurna', 'indah', 'cantik',
            'menarik', 'seru', 'asyik', 'top', 'terbaik', 'recommended',
            'sukses', 'mantul', 'asik', 'wow', 'kece', 'love', 'sayang',
            'happy', 'fun', 'cool', 'nice', 'good', 'great', 'excellent'
        }
        
        # Negative keywords (Indonesian)
        self.negative_words = {
            'buruk', 'jelek', 'tidak', 'benci', 'sedih', 'kecewa', 'marah',
            'bosan', 'gagal', 'rusak', 'hancur', 'parah', 'ngeri', 'serem',
            'mengerikan', 'menyebalkan', 'bodoh', 'goblok', 'tolol', 'sampah',
            'payah', 'zonk', 'bad', 'hate', 'worst', 'terrible', 'boring',
            'sad', 'angry', 'disappointed', 'annoying', 'stupid', 'trash'
        }
        
        # Emoticons
        self.positive_emoticons = {'😊', '😄', '😃', '🙂', '😁', '🥰', '😍', '❤️', 
                                    '👍', '👏', '🎉', '✨', '💯', '🔥', '😎'}
        self.negative_emoticons = {'😢', '😭', '😡', '😠', '👎', '💔', '😤', 
                                    '😞', '😔', '😒', '😩', '😫'}
    
    def clean_text(self, text: str) -> str:
        """Clean and normalize text"""
        if not text:
            return ""
        
        # Remove URLs
        text = re.sub(r'http\S+|www\S+', '', text)
        
        # Remove mentions
        text = re.sub(r'@\w+', '', text)
        
        # Remove hashtags (keep the word)
        text = re.sub(r'#(\w+)', r'\1', text)
        
        # Convert to lowercase
        text = text.lower()
        
        return text.strip()
    
    def extract_emoticons(self, text: str) -> tuple:
        """Extract emoticons from text"""
        positive_count = sum(1 for char in text if char in self.positive_emoticons)
        negative_count = sum(1 for char in text if char in self.negative_emoticons)
        return positive_count, negative_count
    
    def analyze(self, text: str) -> tuple[str, float]:
        """
        Analyze sentiment of text
        Returns: (sentiment_type, sentiment_score)
        sentiment_type: 'positive', 'neutral', 'negative'
        sentiment_score: -1.0 to 1.0
        """
        if not text:
            return 'neutral', 0.0
        
        # Extract emoticons
        pos_emoticons, neg_emoticons = self.extract_emoticons(text)
        
        # Clean text
        cleaned_text = self.clean_text(text)
        
        # Stem words
        words = cleaned_text.split()
        stemmed_words = [self.stemmer.stem(word) for word in words]
        
        # Count positive and negative words
        positive_count = sum(1 for word in stemmed_words if word in self.positive_words)
        negative_count = sum(1 for word in stemmed_words if word in self.negative_words)
        
        # Add emoticon weights
        positive_count += pos_emoticons * 2
        negative_count += neg_emoticons * 2
        
        # Calculate score
        total = positive_count + negative_count
        
        if total == 0:
            # Use TextBlob as fallback for neutral detection
            try:
                blob = TextBlob(text)
                polarity = blob.sentiment.polarity
                
                if polarity > 0.1:
                    return 'positive', round(polarity, 2)
                elif polarity < -0.1:
                    return 'negative', round(polarity, 2)
                else:
                    return 'neutral', 0.0
            except:
                return 'neutral', 0.0
        
        # Calculate sentiment score
        score = (positive_count - negative_count) / total
        
        # Determine sentiment type
        if score > 0.2:
            sentiment_type = 'positive'
        elif score < -0.2:
            sentiment_type = 'negative'
        else:
            sentiment_type = 'neutral'
        
        return sentiment_type, round(score, 2)


# Global instance
sentiment_analyzer = SentimentAnalyzer()
