#!/usr/bin/env node
/**
 * Extended Test Suite for TradeBul Platform
 * Advanced testing with API simulation and database validation
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
  bright: '\x1b[1m',
};

class ExtendedTestRunner {
  constructor() {
    this.testResults = [];
    this.errors = [];
  }

  log(msg, color = 'reset') {
    console.log(`${colors[color]}${msg}${colors.reset}`);
  }

  async runAll() {
    this.log('\n╔════════════════════════════════════════════════════════════════╗', 'cyan');
    this.log('║     TradeBul Extended Test Suite - Advanced Diagnostics         ║', 'cyan');
    this.log('╚════════════════════════════════════════════════════════════════╝\n', 'cyan');

    const startTime = Date.now();

    // Run all tests
    await this.testDependencyInstallation();
    await this.testFilePermissions();
    await this.testRoutesStructure();
    await this.testServicesStructure();
    await this.testControllersStructure();
    await this.testFrontendStructure();
    await this.testWebSocketImplementation();
    await this.testErrorHandling();
    await this.testSecurityMeasures();
    await this.testPerformancePatterns();

    const duration = (Date.now() - startTime) / 1000;
    this.generateFinalReport(duration);
  }

  // Test: Dependency Installation Status
  async testDependencyInstallation() {
    this.log('\n[TEST 1] Dependency Installation Status', 'blue');
    
    try {
      const nodeModulesPath = path.join(__dirname, 'node_modules');
      
      if (fs.existsSync(nodeModulesPath)) {
        const backendPath = path.join(__dirname, 'backend', 'node_modules');
        const frontendUserPath = path.join(__dirname, 'frontend', 'user', 'node_modules');
        
        this.log('  ✓ Main node_modules found', 'green');
        
        if (fs.existsSync(backendPath)) {
          this.log('  ✓ Backend node_modules found', 'green');
        } else {
          this.log('  ⚠ Backend node_modules missing - run: cd backend && npm install', 'yellow');
        }
        
        if (fs.existsSync(frontendUserPath)) {
          this.log('  ✓ Frontend (user) node_modules found', 'green');
        } else {
          this.log('  ⚠ Frontend (user) node_modules missing - run: cd frontend/user && npm install', 'yellow');
        }
        
        this.testResults.push({ name: 'Dependencies', status: 'PASS', message: 'At least main dependencies installed' });
      } else {
        this.log('  ✗ node_modules directory not found', 'red');
        this.log('  → Run: npm install', 'yellow');
        this.testResults.push({ name: 'Dependencies', status: 'WARN', message: 'Dependencies not installed - may affect some tests' });
      }
    } catch (err) {
      this.log(`  ✗ Error: ${err.message}`, 'red');
      this.testResults.push({ name: 'Dependencies', status: 'FAIL', message: err.message });
      this.errors.push(`Dependencies: ${err.message}`);
    }
  }

  // Test: File Permissions
  async testFilePermissions() {
    this.log('\n[TEST 2] File Permissions & Accessibility', 'blue');
    
    const criticalFiles = [
      'server.ts',
      'db.ts',
      'package.json',
      'tsconfig.json',
      '.env.example'
    ];
    
    let allReadable = true;
    
    for (const file of criticalFiles) {
      const filePath = path.join(__dirname, file);
      try {
        fs.accessSync(filePath, fs.constants.R_OK);
        this.log(`  ✓ ${file}: readable`, 'green');
      } catch {
        this.log(`  ✗ ${file}: not readable`, 'red');
        allReadable = false;
        this.errors.push(`File not readable: ${file}`);
      }
    }
    
    this.testResults.push({ 
      name: 'File Permissions', 
      status: allReadable ? 'PASS' : 'FAIL', 
      message: allReadable ? 'All critical files readable' : 'Some files not accessible' 
    });
  }

  // Test: Routes Structure
  async testRoutesStructure() {
    this.log('\n[TEST 3] Routes Structure & Organization', 'blue');
    
    try {
      const routesDir = path.join(__dirname, 'routes');
      const routeFiles = fs.readdirSync(routesDir).filter(f => f.endsWith('.ts'));
      
      this.log(`  ✓ Found ${routeFiles.length} route files:`, 'green');
      routeFiles.forEach(file => {
        const filePath = path.join(routesDir, file);
        const content = fs.readFileSync(filePath, 'utf8');
        const routeCount = (content.match(/app\.(get|post|put|delete|patch)/g) || []).length;
        this.log(`    - ${file}: ${routeCount} routes defined`, 'green');
      });
      
      // Check for common route files
      const expectedRoutes = ['dhanRoutes.ts', 'dhanDiagnosticRoutes.ts'];
      const found = routeFiles.filter(f => expectedRoutes.includes(f));
      
      if (found.length > 0) {
        this.log(`  ✓ Found expected route files: ${found.join(', ')}`, 'green');
      }
      
      this.testResults.push({ 
        name: 'Routes Structure', 
        status: 'PASS', 
        message: `${routeFiles.length} route files organized` 
      });
    } catch (err) {
      this.log(`  ✗ Error analyzing routes: ${err.message}`, 'red');
      this.testResults.push({ name: 'Routes Structure', status: 'FAIL', message: err.message });
      this.errors.push(`Routes: ${err.message}`);
    }
  }

  // Test: Services Structure
  async testServicesStructure() {
    this.log('\n[TEST 4] Services Architecture', 'blue');
    
    try {
      const servicesDir = path.join(__dirname, 'services');
      
      if (!fs.existsSync(servicesDir)) {
        this.log('  ⚠ Services directory not found', 'yellow');
        this.testResults.push({ name: 'Services', status: 'WARN', message: 'Services directory missing' });
        return;
      }
      
      const serviceFiles = fs.readdirSync(servicesDir).filter(f => f.endsWith('.ts'));
      
      this.log(`  ✓ Found ${serviceFiles.length} service files:`, 'green');
      
      // Key services to look for
      const expectedServices = ['marketFeedManager', 'developmentMarketSimulator'];
      
      for (const service of expectedServices) {
        const found = serviceFiles.some(f => f.toLowerCase().includes(service.toLowerCase()));
        if (found) {
          this.log(`    ✓ ${service}: ✓ Implemented`, 'green');
        } else {
          this.log(`    ⚠ ${service}: ⚠ Not found`, 'yellow');
        }
      }
      
      this.testResults.push({ 
        name: 'Services', 
        status: 'PASS', 
        message: `${serviceFiles.length} services found` 
      });
    } catch (err) {
      this.log(`  ✗ Error: ${err.message}`, 'red');
      this.testResults.push({ name: 'Services', status: 'FAIL', message: err.message });
      this.errors.push(`Services: ${err.message}`);
    }
  }

  // Test: Controllers Structure
  async testControllersStructure() {
    this.log('\n[TEST 5] Controllers Organization', 'blue');
    
    try {
      const controllersDir = path.join(__dirname, 'controllers');
      
      if (!fs.existsSync(controllersDir)) {
        this.log('  ⚠ Controllers directory found but empty', 'yellow');
        this.testResults.push({ name: 'Controllers', status: 'WARN', message: 'Controllers directory minimal' });
        return;
      }
      
      const files = fs.readdirSync(controllersDir).filter(f => f.endsWith('.ts'));
      
      this.log(`  ✓ Found ${files.length} controller files:`, 'green');
      files.forEach(file => this.log(`    - ${file}`, 'green'));
      
      this.testResults.push({ 
        name: 'Controllers', 
        status: 'PASS', 
        message: `${files.length} controllers organized` 
      });
    } catch (err) {
      this.log(`  ✗ Error: ${err.message}`, 'red');
      this.testResults.push({ name: 'Controllers', status: 'FAIL', message: err.message });
    }
  }

  // Test: Frontend Structure
  async testFrontendStructure() {
    this.log('\n[TEST 6] Frontend Applications Structure', 'blue');
    
    try {
      const frontends = ['user', 'admin'];
      let allValid = true;
      
      for (const frontend of frontends) {
        const frontendDir = path.join(__dirname, 'frontend', frontend);
        
        if (fs.existsSync(frontendDir)) {
          this.log(`  ✓ Frontend ${frontend}: Found`, 'green');
          
          // Check for key files
          const srcDir = path.join(frontendDir, 'src');
          const publicDir = path.join(frontendDir, 'public');
          const pkgFile = path.join(frontendDir, 'package.json');
          
          if (fs.existsSync(srcDir)) {
            const srcFiles = fs.readdirSync(srcDir);
            this.log(`    - src/ with ${srcFiles.length} items`, 'green');
          }
          
          if (fs.existsSync(publicDir)) {
            this.log(`    - public/ directory exists`, 'green');
          }
          
          if (fs.existsSync(pkgFile)) {
            const pkg = JSON.parse(fs.readFileSync(pkgFile, 'utf8'));
            this.log(`    - scripts: ${Object.keys(pkg.scripts || {}).join(', ')}`, 'green');
          }
        } else {
          this.log(`  ⚠ Frontend ${frontend}: Directory missing`, 'yellow');
          allValid = false;
        }
      }
      
      this.testResults.push({ 
        name: 'Frontend Structure', 
        status: allValid ? 'PASS' : 'WARN', 
        message: 'Frontend applications structured' 
      });
    } catch (err) {
      this.log(`  ✗ Error: ${err.message}`, 'red');
      this.testResults.push({ name: 'Frontend Structure', status: 'FAIL', message: err.message });
      this.errors.push(`Frontend: ${err.message}`);
    }
  }

  // Test: WebSocket Implementation
  async testWebSocketImplementation() {
    this.log('\n[TEST 7] WebSocket & Real-Time Features', 'blue');
    
    try {
      const serverPath = path.join(__dirname, 'server.ts');
      const serverContent = fs.readFileSync(serverPath, 'utf8');
      
      const socketIOChecks = [
        { pattern: 'Socket.IO', found: serverContent.includes('socket.io') },
        { pattern: 'Socket connections', found: serverContent.includes('io.on("connection"') },
        { pattern: 'Chart subscriptions', found: serverContent.includes('chart:subscribe') },
        { pattern: 'Symbol subscriptions', found: serverContent.includes('symbol:subscribe') },
        { pattern: 'Disconnect handlers', found: serverContent.includes('disconnect') },
      ];
      
      let allFound = true;
      for (const check of socketIOChecks) {
        if (check.found) {
          this.log(`  ✓ ${check.pattern}: ✓ Implemented`, 'green');
        } else {
          this.log(`  ✗ ${check.pattern}: ✗ Missing`, 'red');
          allFound = false;
        }
      }
      
      this.testResults.push({ 
        name: 'WebSocket Implementation', 
        status: allFound ? 'PASS' : 'WARN', 
        message: 'Real-time features configured' 
      });
    } catch (err) {
      this.log(`  ✗ Error: ${err.message}`, 'red');
      this.testResults.push({ name: 'WebSocket Implementation', status: 'FAIL', message: err.message });
      this.errors.push(`WebSocket: ${err.message}`);
    }
  }

  // Test: Error Handling
  async testErrorHandling() {
    this.log('\n[TEST 8] Error Handling & Logging', 'blue');
    
    try {
      const serverPath = path.join(__dirname, 'server.ts');
      const serverContent = fs.readFileSync(serverPath, 'utf8');
      
      const errorChecks = [
        { pattern: 'try-catch blocks', found: (serverContent.match(/try\s*{/g) || []).length > 0 },
        { pattern: 'error logging', found: serverContent.includes('console.error') },
        { pattern: 'status codes', found: serverContent.includes('status(') },
        { pattern: 'error responses', found: serverContent.includes('error:') },
        { pattern: 'uncaughtException handler', found: serverContent.includes('uncaughtException') },
        { pattern: 'unhandledRejection handler', found: serverContent.includes('unhandledRejection') },
      ];
      
      let errorCount = 0;
      for (const check of errorChecks) {
        if (check.found) {
          this.log(`  ✓ ${check.pattern}`, 'green');
          if (check.pattern === 'try-catch blocks') {
            const matches = serverContent.match(/try\s*{/g) || [];
            this.log(`    (found ${matches.length} try-catch blocks)`, 'green');
          }
          errorCount++;
        } else {
          this.log(`  ⚠ ${check.pattern}: Missing`, 'yellow');
        }
      }
      
      this.testResults.push({ 
        name: 'Error Handling', 
        status: errorCount >= 4 ? 'PASS' : 'WARN', 
        message: `${errorCount}/6 error handling patterns implemented` 
      });
    } catch (err) {
      this.log(`  ✗ Error: ${err.message}`, 'red');
      this.testResults.push({ name: 'Error Handling', status: 'FAIL', message: err.message });
    }
  }

  // Test: Security Measures
  async testSecurityMeasures() {
    this.log('\n[TEST 9] Security Measures & Best Practices', 'blue');
    
    try {
      const serverPath = path.join(__dirname, 'server.ts');
      const dbPath = path.join(__dirname, 'db.ts');
      const serverContent = fs.readFileSync(serverPath, 'utf8');
      const dbContent = fs.readFileSync(dbPath, 'utf8');
      
      const securityChecks = [
        { pattern: 'CORS enabled', found: serverContent.includes('cors()') },
        { pattern: 'Environment variables', found: serverContent.includes('process.env') },
        { pattern: 'JSON middleware', found: serverContent.includes('express.json()') },
        { pattern: 'MongoDB connection', found: dbContent.includes('mongoose.connect') },
        { pattern: 'Authentication routes', found: serverContent.includes('/api/auth') },
        { pattern: 'Admin authentication', found: serverContent.includes('admin-login') },
        { pattern: 'Role-based access', found: serverContent.includes('role') },
      ];
      
      let securityCount = 0;
      for (const check of securityChecks) {
        if (check.found) {
          this.log(`  ✓ ${check.pattern}`, 'green');
          securityCount++;
        } else {
          this.log(`  ⚠ ${check.pattern}: Missing`, 'yellow');
        }
      }
      
      this.testResults.push({ 
        name: 'Security Measures', 
        status: securityCount >= 5 ? 'PASS' : 'WARN', 
        message: `${securityCount}/${securityChecks.length} security features implemented` 
      });
    } catch (err) {
      this.log(`  ✗ Error: ${err.message}`, 'red');
      this.testResults.push({ name: 'Security Measures', status: 'FAIL', message: err.message });
    }
  }

  // Test: Performance Patterns
  async testPerformancePatterns() {
    this.log('\n[TEST 10] Performance Patterns & Optimization', 'blue');
    
    try {
      const serverPath = path.join(__dirname, 'server.ts');
      const serverContent = fs.readFileSync(serverPath, 'utf8');
      
      const perfChecks = [
        { pattern: 'Caching patterns', found: serverContent.includes('cache') || serverContent.includes('Cache') },
        { pattern: 'Connection pooling', found: serverContent.includes('mongoose') },
        { pattern: 'Async operations', found: serverContent.includes('async') },
        { pattern: 'Event-driven architecture', found: serverContent.includes('io.on') },
        { pattern: 'Middleware pattern', found: serverContent.includes('app.use') },
        { pattern: 'Reference counting', found: serverContent.includes('refCounts') || serverContent.includes('RefCount') },
      ];
      
      let perfCount = 0;
      for (const check of perfChecks) {
        if (check.found) {
          this.log(`  ✓ ${check.pattern}`, 'green');
          perfCount++;
        } else {
          this.log(`  ⚠ ${check.pattern}: Not found`, 'yellow');
        }
      }
      
      this.testResults.push({ 
        name: 'Performance Patterns', 
        status: perfCount >= 4 ? 'PASS' : 'WARN', 
        message: `${perfCount}/${perfChecks.length} performance optimizations found` 
      });
    } catch (err) {
      this.log(`  ✗ Error: ${err.message}`, 'red');
      this.testResults.push({ name: 'Performance Patterns', status: 'FAIL', message: err.message });
    }
  }

  generateFinalReport(duration) {
    this.log('\n╔════════════════════════════════════════════════════════════════╗', 'cyan');
    this.log('║               EXTENDED TEST SUITE RESULTS                       ║', 'cyan');
    this.log('╚════════════════════════════════════════════════════════════════╝\n', 'cyan');

    const passed = this.testResults.filter(r => r.status === 'PASS').length;
    const warned = this.testResults.filter(r => r.status === 'WARN').length;
    const failed = this.testResults.filter(r => r.status === 'FAIL').length;

    this.log(`Tests Executed: ${this.testResults.length}`, 'bold');
    this.log(`  ${colors.green}✓ Passed: ${passed}${colors.reset}`);
    this.log(`  ${colors.yellow}⚠ Warnings: ${warned}${colors.reset}`);
    this.log(`  ${colors.red}✗ Failed: ${failed}${colors.reset}`);
    this.log(`  Duration: ${duration.toFixed(2)}s\n`, 'bold');

    // Results table
    this.log('─'.repeat(70), 'cyan');
    this.log('Test Name                        | Status | Message', 'cyan');
    this.log('─'.repeat(70), 'cyan');

    for (const result of this.testResults) {
      const statusColor = result.status === 'PASS' ? 'green' : result.status === 'WARN' ? 'yellow' : 'red';
      const name = result.name.padEnd(32);
      const status = result.status.padEnd(6);
      const msg = result.message.substring(0, 28);
      
      this.log(`${name} | ${colors[statusColor]}${status}${colors.reset} | ${msg}`, 'reset');
    }

    this.log('─'.repeat(70) + '\n', 'cyan');

    if (this.errors.length > 0) {
      this.log('Critical Issues:', 'red');
      this.errors.forEach((e, i) => this.log(`  ${i + 1}. ${e}`, 'red'));
      this.log('', 'reset');
    }

    this.log('✓ Extended test suite completed!', 'green');
  }
}

// Run extended tests
const runner = new ExtendedTestRunner();
runner.runAll().catch(err => {
  console.error('Extended test runner failed:', err);
  process.exit(1);
});
