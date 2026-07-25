"""
Proxy Manager - Festival Mbois Intelligence Platform

Manages proxy rotation for web scraping to avoid rate limiting and IP bans.
Supports HTTP/HTTPS and SOCKS5 proxies.
"""

import os
import asyncio
import aiohttp
from typing import List, Optional, Dict
from loguru import logger
from datetime import datetime, timedelta
import random


class ProxyManager:
    """Manages proxy rotation and health checking"""
    
    def __init__(self, proxy_file: str = None, use_proxies: bool = False):
        self.use_proxies = use_proxies
        self.proxy_file = proxy_file or os.getenv('PROXY_FILE', './proxies.txt')
        self.proxies: List[Dict] = []
        self.current_index = 0
        self.failed_proxies: Dict[str, datetime] = {}
        self.retry_after = timedelta(minutes=10)  # Retry failed proxy after 10 min
        
        if self.use_proxies:
            self.load_proxies()
    
    def load_proxies(self):
        """Load proxies from file"""
        if not os.path.exists(self.proxy_file):
            logger.warning(f"Proxy file not found: {self.proxy_file}")
            logger.warning("Creating example proxy file...")
            self.create_example_proxy_file()
            return
        
        try:
            with open(self.proxy_file, 'r') as f:
                lines = f.readlines()
            
            for line in lines:
                line = line.strip()
                if not line or line.startswith('#'):
                    continue
                
                proxy_dict = self.parse_proxy(line)
                if proxy_dict:
                    self.proxies.append(proxy_dict)
            
            logger.info(f"Loaded {len(self.proxies)} proxies from {self.proxy_file}")
            
        except Exception as e:
            logger.error(f"Error loading proxies: {e}")
    
    def parse_proxy(self, proxy_string: str) -> Optional[Dict]:
        """Parse proxy string into dictionary"""
        try:
            # Format: protocol://host:port
            # Or: protocol://user:pass@host:port
            
            if '://' not in proxy_string:
                proxy_string = f"http://{proxy_string}"
            
            return {
                'url': proxy_string,
                'http': proxy_string,
                'https': proxy_string,
                'failures': 0,
                'last_used': None,
                'success_count': 0,
            }
        except Exception as e:
            logger.error(f"Error parsing proxy {proxy_string}: {e}")
            return None
    
    def get_next_proxy(self) -> Optional[Dict]:
        """Get next proxy in rotation"""
        if not self.use_proxies or not self.proxies:
            return None
        
        # Filter out recently failed proxies
        available_proxies = []
        now = datetime.now()
        
        for proxy in self.proxies:
            proxy_url = proxy['url']
            if proxy_url in self.failed_proxies:
                last_failure = self.failed_proxies[proxy_url]
                if now - last_failure < self.retry_after:
                    continue  # Still in cooldown
                else:
                    # Remove from failed list, give it another try
                    del self.failed_proxies[proxy_url]
            
            available_proxies.append(proxy)
        
        if not available_proxies:
            logger.warning("No available proxies! All proxies are in cooldown.")
            return None
        
        # Rotate to next proxy
        self.current_index = (self.current_index + 1) % len(available_proxies)
        proxy = available_proxies[self.current_index]
        proxy['last_used'] = datetime.now()
        
        return proxy
    
    def get_random_proxy(self) -> Optional[Dict]:
        """Get random proxy instead of rotation"""
        if not self.use_proxies or not self.proxies:
            return None
        
        available_proxies = [p for p in self.proxies if p['url'] not in self.failed_proxies]
        
        if not available_proxies:
            return None
        
        return random.choice(available_proxies)
    
    def mark_proxy_failed(self, proxy: Dict):
        """Mark proxy as failed"""
        proxy['failures'] += 1
        self.failed_proxies[proxy['url']] = datetime.now()
        logger.warning(f"Proxy {proxy['url']} marked as failed (failures: {proxy['failures']})")
    
    def mark_proxy_success(self, proxy: Dict):
        """Mark proxy as successful"""
        proxy['success_count'] += 1
        if proxy['url'] in self.failed_proxies:
            del self.failed_proxies[proxy['url']]
    
    async def test_proxy(self, proxy: Dict, test_url: str = 'https://httpbin.org/ip') -> bool:
        """Test if proxy is working"""
        try:
            timeout = aiohttp.ClientTimeout(total=10)
            async with aiohttp.ClientSession(timeout=timeout) as session:
                async with session.get(test_url, proxy=proxy['url']) as response:
                    if response.status == 200:
                        logger.info(f"✓ Proxy {proxy['url']} is working")
                        return True
                    else:
                        logger.warning(f"✗ Proxy {proxy['url']} returned status {response.status}")
                        return False
        except Exception as e:
            logger.warning(f"✗ Proxy {proxy['url']} failed: {e}")
            return False
    
    async def test_all_proxies(self):
        """Test all proxies and remove dead ones"""
        if not self.proxies:
            return
        
        logger.info(f"Testing {len(self.proxies)} proxies...")
        
        tasks = [self.test_proxy(proxy) for proxy in self.proxies]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        working_proxies = []
        for proxy, result in zip(self.proxies, results):
            if result is True:
                working_proxies.append(proxy)
            else:
                logger.warning(f"Removing dead proxy: {proxy['url']}")
        
        self.proxies = working_proxies
        logger.info(f"✓ {len(self.proxies)} working proxies available")
    
    def create_example_proxy_file(self):
        """Create example proxy file"""
        example_content = """# Proxy List for Festival Mbois Intelligence Platform
# Format: protocol://host:port
# Or with auth: protocol://username:password@host:port
# Supported protocols: http, https, socks5

# Example proxies (replace with your own):
# http://proxy1.example.com:8080
# http://user:pass@proxy2.example.com:8080
# socks5://proxy3.example.com:1080

# Free proxies (not recommended for production):
# Get free proxies from: https://free-proxy-list.net/
# Note: Free proxies are unreliable and slow

# Example entries:
# http://51.158.68.68:8811
# http://198.49.68.80:80
# socks5://74.119.147.209:4145
"""
        try:
            with open(self.proxy_file, 'w') as f:
                f.write(example_content)
            logger.info(f"Created example proxy file: {self.proxy_file}")
        except Exception as e:
            logger.error(f"Could not create proxy file: {e}")
    
    def get_proxy_stats(self) -> Dict:
        """Get proxy statistics"""
        total = len(self.proxies)
        failed = len(self.failed_proxies)
        available = total - failed
        
        total_success = sum(p['success_count'] for p in self.proxies)
        total_failures = sum(p['failures'] for p in self.proxies)
        
        return {
            'total_proxies': total,
            'available_proxies': available,
            'failed_proxies': failed,
            'total_success': total_success,
            'total_failures': total_failures,
        }
    
    def __repr__(self):
        stats = self.get_proxy_stats()
        return f"ProxyManager(total={stats['total_proxies']}, available={stats['available_proxies']})"


# Example usage
async def test_proxy_manager():
    """Test proxy manager functionality"""
    pm = ProxyManager(use_proxies=True)
    
    if pm.proxies:
        logger.info("Testing all proxies...")
        await pm.test_all_proxies()
        
        logger.info(f"\nProxy Manager Stats: {pm.get_proxy_stats()}")
        
        # Get next proxy
        proxy = pm.get_next_proxy()
        if proxy:
            logger.info(f"Next proxy: {proxy['url']}")
    else:
        logger.info("No proxies configured. Running without proxy.")


if __name__ == "__main__":
    # Test the proxy manager
    asyncio.run(test_proxy_manager())
