#!/usr/bin/env python3
"""
Flask Wrapper for Sentry V20 - Macro Sentry Monitor
Displays live output from sentry_v20.py on a web interface
"""

from flask import Flask, render_template_string, jsonify
import subprocess
import threading
import queue
import os
from datetime import datetime
import re

app = Flask(__name__)

# Output queue to store script output
output_queue = queue.Queue()
script_process = None
script_thread = None

# HTML Template
HTML_TEMPLATE = """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Macro Sentry V20 - Live Monitor</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
            background: #0a0a0a;
            color: #00ff00;
            padding: 20px;
            line-height: 1.6;
        }
        .container {
            max-width: 1400px;
            margin: 0 auto;
        }
        h1 {
            color: #00ff00;
            text-align: center;
            margin-bottom: 20px;
            font-size: 24px;
            border-bottom: 2px solid #00ff00;
            padding-bottom: 10px;
        }
        .status {
            text-align: center;
            margin-bottom: 20px;
            padding: 10px;
            background: #1a1a1a;
            border: 1px solid #00ff00;
            border-radius: 5px;
        }
        .status.running {
            border-color: #00ff00;
            color: #00ff00;
        }
        .status.stopped {
            border-color: #ff0000;
            color: #ff0000;
        }
        #output {
            background: #000000;
            border: 2px solid #00ff00;
            padding: 20px;
            border-radius: 5px;
            min-height: 600px;
            max-height: 80vh;
            overflow-y: auto;
            white-space: pre-wrap;
            word-wrap: break-word;
            font-size: 14px;
        }
        .red-alert {
            background: #ff0000 !important;
            color: #ffffff !important;
            padding: 15px;
            margin: 10px 0;
            border: 3px solid #ff0000;
            border-radius: 5px;
            font-weight: bold;
            animation: blink 1s infinite;
        }
        @keyframes blink {
            0%, 50% { opacity: 1; }
            51%, 100% { opacity: 0.7; }
        }
        .warning {
            color: #ffff00;
        }
        .success {
            color: #00ff00;
        }
        .error {
            color: #ff0000;
        }
        .info {
            color: #00ffff;
        }
        .controls {
            text-align: center;
            margin: 20px 0;
        }
        button {
            background: #00ff00;
            color: #000000;
            border: none;
            padding: 10px 20px;
            margin: 5px;
            border-radius: 5px;
            cursor: pointer;
            font-weight: bold;
            font-family: 'Consolas', monospace;
        }
        button:hover {
            background: #00cc00;
        }
        button.stop {
            background: #ff0000;
            color: #ffffff;
        }
        button.stop:hover {
            background: #cc0000;
        }
        .timestamp {
            color: #888888;
            font-size: 12px;
            margin-top: 10px;
            text-align: center;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🚀 MACRO SENTRY V20 - LIVE MONITOR</h1>
        
        <div id="status" class="status stopped">
            Status: Stopped
        </div>
        
        <div class="controls">
            <button onclick="startScript()">▶ Start Monitor</button>
            <button class="stop" onclick="stopScript()">⏹ Stop Monitor</button>
            <button onclick="clearOutput()">🗑 Clear</button>
        </div>
        
        <div id="output"></div>
        
        <div class="timestamp">
            Last updated: <span id="lastUpdate">Never</span>
        </div>
    </div>

    <script>
        let outputElement = document.getElementById('output');
        let statusElement = document.getElementById('status');
        let lastUpdateElement = document.getElementById('lastUpdate');
        let updateInterval;

        function formatOutput(text) {
            // Highlight RED ALERT
            text = text.replace(/(🔴 RED ALERT.*?============================================================)/gs, 
                '<div class="red-alert">$1</div>');
            
            // Highlight warnings
            text = text.replace(/(⚠️.*?)/g, '<span class="warning">$1</span>');
            
            // Highlight errors
            text = text.replace(/(❌.*?)/g, '<span class="error">$1</span>');
            
            // Highlight success
            text = text.replace(/(✅.*?)/g, '<span class="success">$1</span>');
            
            // Highlight info
            text = text.replace(/(📊|📈|📥|🌍|⛽|🏥)/g, '<span class="info">$1</span>');
            
            return text;
        }

        function updateOutput() {
            fetch('/api/output')
                .then(response => response.json())
                .then(data => {
                    if (data.output) {
                        outputElement.innerHTML = formatOutput(data.output);
                        // Auto-scroll to bottom
                        outputElement.scrollTop = outputElement.scrollHeight;
                    }
                    
                    if (data.status) {
                        statusElement.className = 'status ' + data.status;
                        statusElement.textContent = 'Status: ' + data.status.charAt(0).toUpperCase() + data.status.slice(1);
                    }
                    
                    lastUpdateElement.textContent = new Date().toLocaleTimeString();
                })
                .catch(error => {
                    console.error('Error fetching output:', error);
                });
        }

        function startScript() {
            fetch('/api/start', { method: 'POST' })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        statusElement.className = 'status running';
                        statusElement.textContent = 'Status: Running';
                        updateInterval = setInterval(updateOutput, 1000); // Update every second
                        updateOutput();
                    } else {
                        alert('Error: ' + data.error);
                    }
                });
        }

        function stopScript() {
            fetch('/api/stop', { method: 'POST' })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        statusElement.className = 'status stopped';
                        statusElement.textContent = 'Status: Stopped';
                        if (updateInterval) {
                            clearInterval(updateInterval);
                        }
                    }
                });
        }

        function clearOutput() {
            fetch('/api/clear', { method: 'POST' })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        outputElement.textContent = '';
                    }
                });
        }

        // Auto-start on page load
        window.addEventListener('load', function() {
            startScript();
        });

        // Update every second if running
        setInterval(function() {
            if (statusElement.textContent.includes('Running')) {
                updateOutput();
            }
        }, 1000);
    </script>
</body>
</html>
"""

# Store output
output_buffer = []
MAX_BUFFER_SIZE = 1000  # Keep last 1000 lines

def run_sentry_script():
    """Run sentry_v20.py and capture output"""
    global script_process, output_buffer
    
    script_path = os.path.join(os.path.dirname(__file__), 'sentry_v20.py')
    
    try:
        # Run the script
        script_process = subprocess.Popen(
            ['python', script_path],
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            universal_newlines=True,
            bufsize=1
        )
        
        # Read output line by line
        for line in iter(script_process.stdout.readline, ''):
            if not line:
                break
            
            timestamp = datetime.now().strftime('%H:%M:%S')
            formatted_line = f"[{timestamp}] {line.rstrip()}\n"
            
            output_buffer.append(formatted_line)
            
            # Keep buffer size manageable
            if len(output_buffer) > MAX_BUFFER_SIZE:
                output_buffer = output_buffer[-MAX_BUFFER_SIZE:]
            
            # Put in queue for real-time updates
            output_queue.put(formatted_line)
        
        script_process.wait()
        
    except Exception as e:
        error_msg = f"❌ Error running script: {str(e)}\n"
        output_buffer.append(error_msg)
        output_queue.put(error_msg)
    finally:
        script_process = None

@app.route('/')
def index():
    """Main page"""
    return render_template_string(HTML_TEMPLATE)

@app.route('/api/output')
def get_output():
    """Get current output buffer"""
    global script_process
    
    output_text = ''.join(output_buffer)
    
    status = 'running' if script_process and script_process.poll() is None else 'stopped'
    
    return jsonify({
        'output': output_text,
        'status': status
    })

@app.route('/api/start', methods=['POST'])
def start_script():
    """Start the sentry script"""
    global script_thread, script_process
    
    if script_process and script_process.poll() is None:
        return jsonify({'success': False, 'error': 'Script already running'})
    
    # Clear buffer
    output_buffer.clear()
    
    # Start script in background thread
    script_thread = threading.Thread(target=run_sentry_script, daemon=True)
    script_thread.start()
    
    return jsonify({'success': True})

@app.route('/api/stop', methods=['POST'])
def stop_script():
    """Stop the sentry script"""
    global script_process
    
    if script_process:
        script_process.terminate()
        try:
            script_process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            script_process.kill()
        script_process = None
    
    return jsonify({'success': True})

@app.route('/api/clear', methods=['POST'])
def clear_output():
    """Clear output buffer"""
    global output_buffer
    output_buffer.clear()
    return jsonify({'success': True})

if __name__ == '__main__':
    print("="*60)
    print("🚀 Macro Sentry V20 - Flask Web Interface")
    print("="*60)
    print("Starting Flask server on http://localhost:5000")
    print("After starting, run: lt --port 5000")
    print("="*60)
    
    app.run(host='0.0.0.0', port=5000, debug=False, threaded=True)

