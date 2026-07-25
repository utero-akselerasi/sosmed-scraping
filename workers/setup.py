#!/usr/bin/env python3
"""
Setup Script for Workers - Festival Mbois Intelligence Platform

This script helps you set up the workers environment quickly.
"""

import os
import sys
import subprocess
import shutil
from pathlib import Path


def print_header(text):
    """Print section header"""
    print("\n" + "=" * 60)
    print(f"  {text}")
    print("=" * 60 + "\n")


def print_step(step, text):
    """Print step"""
    print(f"[{step}] {text}")


def check_python_version():
    """Check if Python version is adequate"""
    print_step("✓", "Checking Python version...")
    version = sys.version_info
    if version.major < 3 or (version.major == 3 and version.minor < 8):
        print(f"ERROR: Python 3.8+ required, found {version.major}.{version.minor}")
        return False
    print(f"  Python {version.major}.{version.minor}.{version.micro} ✓")
    return True


def create_venv():
    """Create virtual environment"""
    print_step("1", "Creating virtual environment...")
    
    if os.path.exists("venv"):
        print("  Virtual environment already exists")
        return True
    
    try:
        subprocess.run([sys.executable, "-m", "venv", "venv"], check=True)
        print("  Virtual environment created ✓")
        return True
    except Exception as e:
        print(f"  ERROR: {e}")
        return False


def get_pip_path():
    """Get pip executable path"""
    if sys.platform == "win32":
        return os.path.join("venv", "Scripts", "pip.exe")
    else:
        return os.path.join("venv", "bin", "pip")


def install_dependencies():
    """Install Python dependencies"""
    print_step("2", "Installing dependencies...")
    
    pip = get_pip_path()
    
    try:
        # Upgrade pip first
        subprocess.run([pip, "install", "--upgrade", "pip"], check=True)
        
        # Install requirements
        subprocess.run([pip, "install", "-r", "requirements.txt"], check=True)
        
        print("  Dependencies installed ✓")
        return True
    except Exception as e:
        print(f"  ERROR: {e}")
        return False


def download_nltk_data():
    """Download NLTK data"""
    print_step("3", "Downloading NLTK data...")
    
    python = sys.executable if not os.path.exists("venv") else (
        os.path.join("venv", "Scripts", "python.exe") if sys.platform == "win32"
        else os.path.join("venv", "bin", "python")
    )
    
    try:
        subprocess.run([
            python, "-c",
            "import nltk; nltk.download('stopwords'); nltk.download('punkt')"
        ], check=True)
        print("  NLTK data downloaded ✓")
        return True
    except Exception as e:
        print(f"  WARNING: Could not download NLTK data: {e}")
        return False


def install_playwright():
    """Install Playwright browsers"""
    print_step("4", "Installing Playwright browsers (for TikTok)...")
    
    python = sys.executable if not os.path.exists("venv") else (
        os.path.join("venv", "Scripts", "python.exe") if sys.platform == "win32"
        else os.path.join("venv", "bin", "python")
    )
    
    try:
        subprocess.run([python, "-m", "playwright", "install", "chromium"], check=True)
        print("  Playwright browsers installed ✓")
        return True
    except Exception as e:
        print(f"  WARNING: Could not install Playwright: {e}")
        print("  TikTok scraping may not work without Playwright")
        return False


def create_env_file():
    """Create .env file from example"""
    print_step("5", "Setting up environment configuration...")
    
    if os.path.exists(".env"):
        print("  .env file already exists")
        return True
    
    env_content = """# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=festival_mbois_db
DB_USER=postgres
DB_PASSWORD=your_password_here

# Redis (Optional)
REDIS_HOST=localhost
REDIS_PORT=6379

# Instagram Settings
INSTAGRAM_ENABLED=true
INSTAGRAM_USERNAME=
INSTAGRAM_PASSWORD=
INSTAGRAM_MAX_POSTS=50

# TikTok Settings
TIKTOK_ENABLED=true
TIKTOK_MAX_VIDEOS=50

# Website Settings
WEBSITE_ENABLED=true
WEBSITE_URLS=https://detik.com,https://kompas.com
WEBSITE_MAX_ARTICLES=30

# Worker Settings
WORKER_INTERVAL=900
MAX_RETRIES=3
RETRY_DELAY=5

# Proxy Settings
USE_PROXIES=false
PROXY_FILE=./proxies.txt

# AI Sentiment (Optional - requires large download)
USE_AI_SENTIMENT=false
INDOBERT_MODEL=indobenchmark/indobert-base-p1
SENTIMENT_CONFIDENCE_THRESHOLD=0.7

# Logging
LOG_LEVEL=INFO
"""
    
    try:
        with open(".env", "w") as f:
            f.write(env_content)
        print("  .env file created ✓")
        print("  ⚠️  Please edit .env and add your database credentials!")
        return True
    except Exception as e:
        print(f"  ERROR: {e}")
        return False


def create_directories():
    """Create necessary directories"""
    print_step("6", "Creating directories...")
    
    dirs = ["logs", "data", "cache"]
    
    for dirname in dirs:
        os.makedirs(dirname, exist_ok=True)
    
    print(f"  Created {len(dirs)} directories ✓")
    return True


def test_database_connection():
    """Test database connection"""
    print_step("7", "Testing database connection...")
    
    try:
        import asyncpg
        import asyncio
        from dotenv import load_dotenv
        
        load_dotenv()
        
        async def test():
            try:
                conn = await asyncpg.connect(
                    host=os.getenv('DB_HOST', 'localhost'),
                    port=int(os.getenv('DB_PORT', 5432)),
                    database=os.getenv('DB_NAME', 'festival_mbois_db'),
                    user=os.getenv('DB_USER', 'postgres'),
                    password=os.getenv('DB_PASSWORD', ''),
                    timeout=5
                )
                await conn.close()
                return True
            except Exception as e:
                print(f"  WARNING: Database connection failed: {e}")
                return False
        
        result = asyncio.run(test())
        if result:
            print("  Database connection successful ✓")
        else:
            print("  ⚠️  Could not connect to database. Please check your .env settings.")
        return result
        
    except Exception as e:
        print(f"  WARNING: Could not test database: {e}")
        return False


def print_next_steps():
    """Print next steps"""
    print_header("Setup Complete!")
    
    print("Next steps:\n")
    print("1. Edit .env file with your database credentials:")
    print("   - Update DB_HOST, DB_NAME, DB_USER, DB_PASSWORD")
    print("")
    print("2. (Optional) Add Instagram credentials for better scraping:")
    print("   - Set INSTAGRAM_USERNAME and INSTAGRAM_PASSWORD in .env")
    print("")
    print("3. (Optional) Configure proxies:")
    print("   - Edit proxies.txt with your proxy list")
    print("   - Set USE_PROXIES=true in .env")
    print("")
    print("4. Test workers:")
    
    if sys.platform == "win32":
        print("   venv\\Scripts\\activate")
        print("   python instagram/worker.py")
    else:
        print("   source venv/bin/activate")
        print("   python instagram/worker.py")
    
    print("")
    print("5. Run all workers:")
    print("   python run_all.py")
    print("")
    print("For more information, see README.md and IMPLEMENTATION-PLAN.md")
    print("")


def main():
    """Main setup function"""
    print_header("Workers Setup - Festival Mbois Intelligence Platform")
    
    # Check Python version
    if not check_python_version():
        sys.exit(1)
    
    # Run setup steps
    steps = [
        create_venv,
        install_dependencies,
        download_nltk_data,
        install_playwright,
        create_env_file,
        create_directories,
        test_database_connection,
    ]
    
    for step_func in steps:
        if not step_func():
            print("\n⚠️  Setup encountered issues but may still work.")
            print("Please check the errors above and fix them manually.\n")
            break
    
    print_next_steps()


if __name__ == "__main__":
    main()
