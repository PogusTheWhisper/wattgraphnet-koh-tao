"""
Setup script for WattGraphNet project.
Run this script to verify your installation and setup.
"""

import sys
import subprocess
import importlib
from pathlib import Path

def check_python_version():
    """Check if Python version is compatible."""
    version = sys.version_info
    if version.major < 3 or (version.major == 3 and version.minor < 8):
        print("❌ Python 3.8+ required. Current version:", sys.version)
        return False
    print(f"✅ Python version: {sys.version}")
    return True

def check_package(package_name, import_name=None):
    """Check if a package is installed."""
    if import_name is None:
        import_name = package_name
    
    try:
        module = importlib.import_module(import_name)
        version = getattr(module, '__version__', 'unknown')
        print(f"✅ {package_name}: {version}")
        return True
    except ImportError:
        print(f"❌ {package_name}: Not installed")
        return False

def check_cuda():
    """Check CUDA availability."""
    try:
        import torch
        if torch.cuda.is_available():
            print(f"✅ CUDA available: {torch.cuda.get_device_name(0)}")
            print(f"   CUDA version: {torch.version.cuda}")
            return True
        else:
            print("⚠️  CUDA not available (CPU-only mode)")
            return False
    except ImportError:
        print("❌ PyTorch not installed")
        return False

def create_directories():
    """Create necessary directories."""
    directories = [
        "data/raw",
        "data/cleaned", 
        "data/preprocessed",
        "models/autogluon",
        "models/pytorch",
        "results/visualizations",
        "results/metrics",
        "logs",
        "docs"
    ]
    
    for dir_path in directories:
        Path(dir_path).mkdir(parents=True, exist_ok=True)
    
    print("✅ Directory structure created")

def main():
    """Main setup function."""
    print("🚀 WattGraphNet Setup Verification")
    print("=" * 50)
    
    # Check Python version
    if not check_python_version():
        sys.exit(1)
    
    print("\n📦 Checking Required Packages:")
    print("-" * 30)
    
    # Core packages
    required_packages = [
        ("pandas", "pandas"),
        ("numpy", "numpy"), 
        ("matplotlib", "matplotlib"),
        ("scikit-learn", "sklearn"),
        ("torch", "torch"),
        ("torch-geometric", "torch_geometric"),
    ]
    
    missing_packages = []
    for package, import_name in required_packages:
        if not check_package(package, import_name):
            missing_packages.append(package)
    
    # Optional packages
    print("\n📦 Checking Optional Packages:")
    print("-" * 30)
    
    optional_packages = [
        ("autogluon", "autogluon"),
        ("seaborn", "seaborn"),
        ("plotly", "plotly"),
        ("folium", "folium"),
        ("jupyter", "jupyter"),
    ]
    
    for package, import_name in optional_packages:
        check_package(package, import_name)
    
    # Check CUDA
    print("\n🖥️  Hardware Check:")
    print("-" * 20)
    check_cuda()
    
    # Create directories
    print("\n📁 Setting up directories:")
    print("-" * 25)
    create_directories()
    
    # Summary
    print("\n" + "=" * 50)
    if missing_packages:
        print("❌ Setup incomplete. Missing packages:")
        for package in missing_packages:
            print(f"   - {package}")
        print("\nPlease install missing packages and run setup again.")
        print("See README.md for installation instructions.")
    else:
        print("✅ Setup complete! All required packages installed.")
        print("\n🎯 Next steps:")
        print("   1. Run: jupyter notebook notebooks/eda.ipynb")
        print("   2. Explore the data and start training models")
        print("   3. Check docs/QUICK_START.md for detailed guide")
    
    print("=" * 50)

if __name__ == "__main__":
    main()