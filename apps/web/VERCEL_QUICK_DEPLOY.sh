#!/bin/bash

# 🚀 Vercel Quick Deploy Script for EverMed.ai
# BuildPreparer Agent - Production Deployment

echo "🚀 EverMed.ai Vercel Deployment Script"
echo "======================================"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check if we're in the right directory
if [ ! -d "app" ]; then
    print_error "Please run this script from the project root directory (2025_EverMedAi)"
    exit 1
fi

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    print_warning "Vercel CLI not found. Installing..."
    npm install -g vercel
    print_status "Vercel CLI installed"
fi

# Login to Vercel (if not already logged in)
print_info "Checking Vercel authentication..."
if ! vercel whoami &> /dev/null; then
    print_warning "Please login to Vercel..."
    vercel login
fi
print_status "Vercel authentication verified"

echo ""
echo "🎯 Deployment Options:"
echo "1. Deploy Main Application (/app/frontend/)"
echo "2. Deploy Landing Page (/landing/)"
echo "3. Deploy Both"
echo "4. Exit"
echo ""

read -p "Choose deployment option (1-4): " choice

case $choice in
    1)
        echo ""
        print_info "Deploying Main Application..."
        cd app/frontend
        
        # Pre-deployment checks
        print_info "Running pre-deployment checks..."
        
        # Check if build passes
        print_info "Testing build..."
        if npm run build; then
            print_status "Build successful"
        else
            print_error "Build failed. Please fix errors before deploying."
            exit 1
        fi
        
        # Type check
        print_info "Running type check..."
        if npm run type-check; then
            print_status "Type check passed"
        else
            print_warning "Type check has warnings, but continuing..."
        fi
        
        # Deploy to production
        print_info "Deploying to Vercel production..."
        if vercel --prod; then
            print_status "Main application deployed successfully!"
            print_info "Don't forget to:"
            print_warning "1. Set environment variables in Vercel dashboard"
            print_warning "2. Update API URL in vercel.json when backend is deployed"
            print_warning "3. Configure custom domains if needed"
        else
            print_error "Deployment failed"
            exit 1
        fi
        ;;
        
    2)
        echo ""
        print_info "Deploying Landing Page..."
        cd ../../../landing
        
        # Pre-deployment checks
        print_info "Running pre-deployment checks..."
        
        # Check if build passes
        print_info "Testing build..."
        if npm run build; then
            print_status "Build successful"
        else
            print_error "Build failed. Please fix errors before deploying."
            exit 1
        fi
        
        # Deploy to production
        print_info "Deploying to Vercel production..."
        if vercel --prod; then
            print_status "Landing page deployed successfully!"
            print_info "Don't forget to:"
            print_warning "1. Set N8N webhook URL in environment variables"
            print_warning "2. Configure webhook secret"
            print_warning "3. Test webhook functionality"
        else
            print_error "Deployment failed"
            exit 1
        fi
        ;;
        
    3)
        echo ""
        print_info "Deploying both applications..."
        
        # Deploy main app first
        print_info "Deploying Main Application..."
        cd app/frontend
        
        if npm run build && npm run type-check; then
            print_status "Main app build checks passed"
            if vercel --prod; then
                print_status "Main application deployed!"
            else
                print_error "Main app deployment failed"
                exit 1
            fi
        else
            print_error "Main app build failed"
            exit 1
        fi
        
        # Deploy landing page
        cd ../../landing
        print_info "Deploying Landing Page..."
        
        if npm run build; then
            print_status "Landing page build passed"
            if vercel --prod; then
                print_status "Landing page deployed!"
            else
                print_error "Landing page deployment failed"
                exit 1
            fi
        else
            print_error "Landing page build failed"
            exit 1
        fi
        
        print_status "Both applications deployed successfully!"
        ;;
        
    4)
        print_info "Deployment cancelled by user"
        exit 0
        ;;
        
    *)
        print_error "Invalid option selected"
        exit 1
        ;;
esac

echo ""
echo "🎉 Deployment Summary:"
echo "====================="
print_status "Deployment completed successfully!"
echo ""
print_info "Post-deployment checklist:"
echo "□ Set environment variables in Vercel dashboard"
echo "□ Update API URL when backend is deployed"
echo "□ Configure custom domains (app.evermed.ai)"
echo "□ Test authentication flow"
echo "□ Verify PWA functionality"
echo "□ Test webhook integration (landing page)"
echo ""
print_info "Useful commands:"
echo "• Check deployment status: vercel ls"
echo "• View logs: vercel logs [deployment-url]"
echo "• Set environment variables: vercel env add [name] [environment]"
echo "• Add custom domain: vercel domains add [domain]"
echo ""
print_info "Need help? Check:"
echo "• VERCEL_DEPLOYMENT_GUIDE.md"
echo "• VERCEL_ENV_VARIABLES.md"
echo "• DEPLOYMENT_READINESS_STATUS.md"
echo ""
print_status "Happy deploying! 🚀"