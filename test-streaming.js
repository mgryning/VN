#!/usr/bin/env node

/**
 * Node.js Test for Direct Streaming Implementation
 * 
 * This test verifies that:
 * 1. The requestStoryFromAI method can be called successfully
 * 2. Streaming starts and completes
 * 3. Scene setup is completed (LOC/CHA/STP processing)
 * 4. Direct streaming mode is activated after setup
 * 5. Story content is received and accumulated
 */

const { spawn } = require('child_process');
const KindroidClient = require('./kindroid-client.js');

class StreamingTest {
    constructor() {
        this.testResults = {
            passed: 0,
            failed: 0,
            details: []
        };
        this.serverProcess = null;
        this.serverOutput = '';
    }

    log(message) {
        const timestamp = new Date().toISOString().substring(11, 23);
        console.log(`[${timestamp}] ${message}`);
    }

    assert(condition, message) {
        if (condition) {
            this.testResults.passed++;
            this.log(`✅ PASS: ${message}`);
            this.testResults.details.push({ status: 'PASS', message });
        } else {
            this.testResults.failed++;
            this.log(`❌ FAIL: ${message}`);
            this.testResults.details.push({ status: 'FAIL', message });
        }
    }

    async startServer() {
        return new Promise((resolve, reject) => {
            this.log('🚀 Starting development server...');
            
            // Start the server using npm run dev with process group
            this.serverProcess = spawn('npm', ['run', 'dev'], {
                stdio: ['ignore', 'pipe', 'pipe'],
                shell: true,
                detached: true // Create new process group for proper cleanup
            });

            this.serverProcess.stdout.on('data', (data) => {
                const output = data.toString();
                this.serverOutput += output;
                this.log(`Server output: ${output.trim()}`);
                
                // Look for server startup indication
                if (output.includes('Visual Novel Server running') || output.includes('listening') || output.includes('started')) {
                    this.log('✅ Server started successfully');
                    // Give server a moment to fully initialize
                    setTimeout(resolve, 1000);
                }
            });

            this.serverProcess.stderr.on('data', (data) => {
                const error = data.toString();
                if (!error.includes('EADDRINUSE')) { // Ignore address in use warnings
                    this.log(`⚠️ Server stderr: ${error.trim()}`);
                }
            });

            this.serverProcess.on('error', (error) => {
                this.log(`❌ Failed to start server: ${error.message}`);
                reject(error);
            });

            // Timeout after 10 seconds if server doesn't start
            setTimeout(() => {
                if (this.serverProcess && !this.serverProcess.killed) {
                    this.log('⏱️ Server startup timeout - proceeding with test...');
                    resolve();
                }
            }, 10000);
        });
    }

    async stopServer() {
        if (this.serverProcess && !this.serverProcess.killed) {
            this.log('🛑 Stopping development server...');
            
            return new Promise((resolve) => {
                // Kill the entire process group to ensure all child processes are terminated
                try {
                    process.kill(-this.serverProcess.pid, 'SIGTERM');
                } catch (error) {
                    this.log(`⚠️ Error sending SIGTERM: ${error.message}`);
                }
                
                setTimeout(() => {
                    try {
                        // Force kill the process group if still running
                        process.kill(-this.serverProcess.pid, 'SIGKILL');
                    } catch (error) {
                        // Process already dead, that's fine
                    }
                    
                    // Also kill any processes using port 3500
                    const { spawn } = require('child_process');
                    const killPort = spawn('bash', ['-c', 'lsof -ti:3500 | xargs kill -9 2>/dev/null || true'], {
                        stdio: 'ignore'
                    });
                    
                    killPort.on('close', () => {
                        this.log('✅ Server and port cleanup completed');
                        resolve();
                    });
                    
                    // Fallback timeout
                    setTimeout(() => {
                        this.log('✅ Server cleanup timeout reached');
                        resolve();
                    }, 2000);
                }, 1000);
            });
        } else {
            // Still try to clean up port 3500 even if no server process
            const { spawn } = require('child_process');
            const killPort = spawn('bash', ['-c', 'lsof -ti:3500 | xargs kill -9 2>/dev/null || true'], {
                stdio: 'ignore'
            });
            
            return new Promise((resolve) => {
                killPort.on('close', () => {
                    this.log('✅ Port cleanup completed');
                    resolve();
                });
                
                setTimeout(() => {
                    resolve();
                }, 1000);
            });
        }
    }

    async waitForServer() {
        this.log('⏳ Waiting for server to be ready...');
        
        // Extract port from server output
        const portMatch = this.serverOutput.match(/running on port (\d+)/);
        const port = portMatch ? portMatch[1] : '3000';
        const healthUrl = `http://localhost:${port}/api/health`;
        
        for (let i = 0; i < 10; i++) {
            try {
                const response = await fetch(healthUrl);
                if (response.status === 200) {
                    const data = await response.json();
                    this.log(`✅ Server is responding - ${data.status}`);
                    return true;
                }
            } catch (error) {
                // Server not ready yet
                this.log(`... server check failed: ${error.message}`);
            }
            
            await new Promise(resolve => setTimeout(resolve, 1000));
            this.log(`... checking server (attempt ${i + 1}/10)`);
        }
        
        this.log('⚠️ Server may not be fully ready, but proceeding with test...');
        return false;
    }

    async runTest() {
        this.log('🚀 Starting Direct Streaming Test');
        this.log('==========================================');

        try {
            // Start the server first
            await this.startServer();
            await this.waitForServer();

            // Extract port from server output
            const portMatch = this.serverOutput.match(/running on port (\d+)/);
            const port = portMatch ? portMatch[1] : '3000';
            const baseURL = `http://localhost:${port}`;
            
            this.log(`🔌 Using server at ${baseURL}`);
            
            // Initialize client in test mode
            this.log('📋 Initializing KindroidClient in test mode...');
            const client = new KindroidClient({ 
                testMode: true,
                baseURL: baseURL
            });

            this.assert(client.isTestMode === true, 'Client initialized in test mode');
            this.assert(client.baseURL === baseURL, 'Base URL set correctly');

            // Test the requestStoryFromAI method
            this.log('📞 Calling requestStoryFromAI()...');
            
            const startTime = Date.now();
            await client.requestStoryFromAI();
            const endTime = Date.now();
            const duration = endTime - startTime;

            this.log(`⏱️ Request completed in ${duration}ms`);

            // Analyze test results
            this.log('🔍 Analyzing streaming results...');
            const results = client.testResults;

            // Check basic streaming functionality
            this.assert(results.streamingStarted === true, 'Streaming was initiated');
            this.assert(results.error === null || results.error === undefined, 'No errors occurred during streaming');

            // Check scene setup completion
            this.assert(results.sceneSetupCompleted === true, 'Scene setup (LOC/CHA/STP) completed successfully');
            
            // Check scene setup content quality
            this.assert(results.locationLength > 2, `Location has sufficient content (${results.locationLength} characters, minimum 3)`);
            this.assert(results.charactersLength > 2, `Characters have sufficient content (${results.charactersLength} characters, minimum 3)`);
            this.assert(results.setupLength > 3, `Setup description has sufficient content (${results.setupLength} characters, minimum 4)`);

            // Check direct streaming activation
            this.assert(results.directStreamingActivated === true, 'Direct streaming mode was activated');

            // Check story content reception
            this.assert(results.storyContentReceived === true, 'Story content was received and accumulated');
            this.assert(results.finalStoryLength > 50, `Final story has sufficient content (${results.finalStoryLength} characters, minimum 50)`);

            // Check accumulated content
            const hasAccumulator = client.streamAccumulator && client.streamAccumulator.length > 50;
            this.assert(hasAccumulator, `Stream accumulator contains sufficient text (${client.streamAccumulator?.length || 0} chars, minimum 50)`);

            // Additional checks
            this.assert(client.sceneSetupComplete === true, 'Scene setup completion flag is set');

            // Log some sample content if available
            if (client.streamAccumulator && client.streamAccumulator.length > 0) {
                const sample = client.streamAccumulator.substring(0, 100);
                this.log(`📄 Sample content: "${sample}${client.streamAccumulator.length > 100 ? '...' : ''}"`);
            }

        } catch (error) {
            this.log(`💥 Test execution failed: ${error.message}`);
            this.assert(false, `Test execution completed without exceptions (Error: ${error.message})`);
            
            if (error.code === 'ECONNREFUSED') {
                this.log('💡 Hint: Server connection failed');
            }
        } finally {
            // Always stop the server
            await this.stopServer();
            
            // Additional cleanup - ensure no processes remain on port 3500
            const { spawn } = require('child_process');
            const finalCleanup = spawn('bash', ['-c', 'lsof -ti:3500 | xargs kill -9 2>/dev/null || true'], {
                stdio: 'ignore'
            });
            await new Promise((resolve) => {
                finalCleanup.on('close', resolve);
                setTimeout(resolve, 1000);
            });
        }

        // Print summary
        this.printSummary();
    }

    printSummary() {
        this.log('==========================================');
        this.log('📊 TEST SUMMARY');
        this.log('==========================================');
        
        const total = this.testResults.passed + this.testResults.failed;
        const passRate = total > 0 ? ((this.testResults.passed / total) * 100).toFixed(1) : 0;
        
        this.log(`Total Tests: ${total}`);
        this.log(`Passed: ${this.testResults.passed}`);
        this.log(`Failed: ${this.testResults.failed}`);
        this.log(`Pass Rate: ${passRate}%`);
        
        if (this.testResults.failed === 0) {
            this.log('🎉 ALL TESTS PASSED! Direct streaming is working correctly.');
        } else {
            this.log('⚠️ Some tests failed. Check the details above.');
            
            this.log('\n📋 Failed Tests:');
            this.testResults.details
                .filter(detail => detail.status === 'FAIL')
                .forEach(detail => this.log(`  - ${detail.message}`));
        }
        
        this.log('==========================================');
        
        // Exit with appropriate code
        process.exit(this.testResults.failed === 0 ? 0 : 1);
    }
}

// Check if node-fetch is available for older Node versions
async function checkDependencies() {
    try {
        // Try to use built-in fetch (Node 18+)
        if (typeof fetch === 'undefined') {
            try {
                global.fetch = require('node-fetch');
                console.log('📦 Using node-fetch for HTTP requests');
            } catch (e) {
                console.error('❌ node-fetch not available. Please install it:');
                console.error('   npm install node-fetch');
                process.exit(1);
            }
        } else {
            console.log('📦 Using built-in fetch API');
        }
    } catch (error) {
        console.error('❌ Error checking dependencies:', error.message);
        process.exit(1);
    }
}

// Main execution
async function main() {
    console.log('🧪 Direct Streaming Test Suite');
    console.log('Testing unified streaming approach without hybrid logic');
    console.log('');
    
    await checkDependencies();
    
    const test = new StreamingTest();
    
    // Handle cleanup on exit
    const cleanup = async () => {
        console.log('\n🧹 Cleaning up...');
        await test.stopServer();
        
        // Final port cleanup
        const { spawn } = require('child_process');
        const killPort = spawn('bash', ['-c', 'lsof -ti:3500 | xargs kill -9 2>/dev/null || true'], {
            stdio: 'ignore'
        });
        await new Promise((resolve) => {
            killPort.on('close', resolve);
            setTimeout(resolve, 1000);
        });
        
        process.exit(0);
    };
    
    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
    process.on('uncaughtException', async (error) => {
        console.error('💥 Uncaught exception:', error);
        await cleanup();
        process.exit(1);
    });
    
    await test.runTest();
}

// Run the test if this script is executed directly
if (require.main === module) {
    main().catch(error => {
        console.error('💥 Unhandled error:', error);
        process.exit(1);
    });
}

module.exports = StreamingTest;