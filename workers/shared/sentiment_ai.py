"""
AI-Powered Sentiment Analyzer - Festival Mbois Intelligence Platform

Uses IndoBERT (Indonesian BERT) for more accurate sentiment analysis.
Falls back to rule-based analysis if AI model is not available.
"""

import os
from typing import Tuple, Optional
from loguru import logger

# Try importing transformers for AI sentiment
try:
    from transformers import pipeline, AutoTokenizer, AutoModelForSequenceClassification
    import torch
    AI_AVAILABLE = True
except ImportError:
    AI_AVAILABLE = False
    logger.warning("Transformers not available. Install with: pip install transformers torch")


class AISentimentAnalyzer:
    """AI-powered sentiment analyzer using IndoBERT"""
    
    def __init__(self, use_ai: bool = False):
        self.use_ai = use_ai and AI_AVAILABLE
        self.model = None
        self.tokenizer = None
        self.classifier = None
        self.confidence_threshold = float(os.getenv('SENTIMENT_CONFIDENCE_THRESHOLD', 0.7))
        
        if self.use_ai:
            self.load_model()
    
    def load_model(self):
        """Load IndoBERT model"""
        try:
            model_name = os.getenv('INDOBERT_MODEL', 'indobenchmark/indobert-base-p1')
            
            logger.info(f"Loading AI sentiment model: {model_name}")
            logger.info("This may take a while on first run (downloading model)...")
            
            # Check if GPU is available
            device = 0 if torch.cuda.is_available() else -1
            device_name = "GPU" if device == 0 else "CPU"
            logger.info(f"Using device: {device_name}")
            
            # Load sentiment analysis pipeline
            # Note: You may need to fine-tune IndoBERT for sentiment analysis
            # or use a pre-trained sentiment model
            
            # Option 1: Use generic sentiment pipeline (if available)
            try:
                self.classifier = pipeline(
                    "sentiment-analysis",
                    model=model_name,
                    device=device
                )
                logger.info("✓ AI sentiment model loaded successfully")
                
            except Exception as e:
                logger.warning(f"Could not load sentiment pipeline: {e}")
                logger.info("Attempting to load model manually...")
                
                # Option 2: Load model and tokenizer manually
                self.tokenizer = AutoTokenizer.from_pretrained(model_name)
                self.model = AutoModelForSequenceClassification.from_pretrained(model_name)
                
                if device == 0:
                    self.model = self.model.cuda()
                
                logger.info("✓ AI model and tokenizer loaded successfully")
                
        except Exception as e:
            logger.error(f"Failed to load AI model: {e}")
            logger.info("Falling back to rule-based sentiment analysis")
            self.use_ai = False
    
    def analyze_with_ai(self, text: str) -> Tuple[str, float]:
        """Analyze sentiment using AI model"""
        if not text or not text.strip():
            return 'neutral', 0.5
        
        try:
            # Clean text
            text = text.strip()[:512]  # Limit to 512 chars for BERT
            
            if self.classifier:
                # Use pipeline
                result = self.classifier(text)[0]
                label = result['label'].lower()
                score = result['score']
                
                # Map labels to our format
                if 'pos' in label or label == 'positive':
                    sentiment = 'positive'
                elif 'neg' in label or label == 'negative':
                    sentiment = 'negative'
                else:
                    sentiment = 'neutral'
                
                return sentiment, score
                
            elif self.model and self.tokenizer:
                # Use model manually
                inputs = self.tokenizer(text, return_tensors="pt", truncation=True, max_length=512)
                
                if torch.cuda.is_available():
                    inputs = {k: v.cuda() for k, v in inputs.items()}
                
                with torch.no_grad():
                    outputs = self.model(**inputs)
                    predictions = torch.nn.functional.softmax(outputs.logits, dim=-1)
                    predicted_class = torch.argmax(predictions, dim=-1).item()
                    confidence = predictions[0][predicted_class].item()
                
                # Map class to sentiment
                sentiment_map = {0: 'negative', 1: 'neutral', 2: 'positive'}
                sentiment = sentiment_map.get(predicted_class, 'neutral')
                
                return sentiment, confidence
            
            else:
                logger.warning("AI model not properly initialized")
                return 'neutral', 0.5
                
        except Exception as e:
            logger.error(f"AI sentiment analysis failed: {e}")
            return 'neutral', 0.5
    
    def analyze(self, text: str, use_rule_fallback: bool = True) -> Tuple[str, float]:
        """
        Analyze sentiment with AI and fallback to rule-based if needed
        
        Args:
            text: Text to analyze
            use_rule_fallback: Use rule-based analysis if AI confidence is low
            
        Returns:
            Tuple of (sentiment, confidence_score)
        """
        if not self.use_ai:
            # AI not available, use rule-based immediately
            from shared.sentiment import sentiment_analyzer
            return sentiment_analyzer.analyze(text)
        
        # Try AI analysis
        sentiment, confidence = self.analyze_with_ai(text)
        
        # If confidence is low and fallback is enabled, use rule-based
        if confidence < self.confidence_threshold and use_rule_fallback:
            logger.debug(f"AI confidence too low ({confidence:.2f}), using rule-based fallback")
            from shared.sentiment import sentiment_analyzer
            return sentiment_analyzer.analyze(text)
        
        return sentiment, confidence
    
    def batch_analyze(self, texts: list) -> list:
        """Analyze multiple texts at once (more efficient)"""
        if not self.use_ai or not self.classifier:
            # Fall back to individual analysis
            from shared.sentiment import sentiment_analyzer
            return [sentiment_analyzer.analyze(text) for text in texts]
        
        try:
            # Batch process with AI
            results = self.classifier(texts)
            
            analyzed = []
            for result in results:
                label = result['label'].lower()
                score = result['score']
                
                if 'pos' in label or label == 'positive':
                    sentiment = 'positive'
                elif 'neg' in label or label == 'negative':
                    sentiment = 'negative'
                else:
                    sentiment = 'neutral'
                
                analyzed.append((sentiment, score))
            
            return analyzed
            
        except Exception as e:
            logger.error(f"Batch AI sentiment analysis failed: {e}")
            # Fall back to individual analysis
            from shared.sentiment import sentiment_analyzer
            return [sentiment_analyzer.analyze(text) for text in texts]


# Global instance
ai_sentiment_analyzer = None

def get_ai_analyzer(use_ai: bool = None) -> AISentimentAnalyzer:
    """Get or create global AI sentiment analyzer instance"""
    global ai_sentiment_analyzer
    
    if ai_sentiment_analyzer is None:
        if use_ai is None:
            use_ai = os.getenv('USE_AI_SENTIMENT', 'false').lower() == 'true'
        
        ai_sentiment_analyzer = AISentimentAnalyzer(use_ai=use_ai)
    
    return ai_sentiment_analyzer


# Example usage and testing
def test_ai_sentiment():
    """Test AI sentiment analyzer"""
    analyzer = AISentimentAnalyzer(use_ai=True)
    
    test_texts = [
        "Festival Mbois sangat menarik dan seru!",
        "Acara ini mengecewakan, banyak kekurangan.",
        "Festival berlangsung seperti biasa.",
        "Wow! Luar biasa sekali pengalaman yang tak terlupakan! ❤️",
        "Buruk banget, tidak akan datang lagi! 😡",
    ]
    
    logger.info("Testing AI Sentiment Analyzer:")
    logger.info("=" * 60)
    
    for text in test_texts:
        sentiment, confidence = analyzer.analyze(text)
        logger.info(f"Text: {text[:50]}...")
        logger.info(f"Sentiment: {sentiment} (confidence: {confidence:.2f})")
        logger.info("-" * 60)
    
    # Test batch analysis
    logger.info("\nTesting batch analysis:")
    results = analyzer.batch_analyze(test_texts)
    for text, (sentiment, confidence) in zip(test_texts, results):
        logger.info(f"{text[:30]}... -> {sentiment} ({confidence:.2f})")


if __name__ == "__main__":
    test_ai_sentiment()
