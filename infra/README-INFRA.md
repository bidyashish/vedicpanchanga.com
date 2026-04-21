# Infrastructure Configuration

Complete infrastructure setup files for replicating the Vedic Panchanga application on new servers.

## 📁 Files Overview

### Application Services
- **panchanga-backend.service** - Systemd service for FastAPI backend (port 8121)
- **panchanga-frontend.service** - Systemd service for Next.js frontend (port 3121)
- **nginx-vedicpanchanga.conf** - Nginx reverse proxy with HTTPS and security headers

### Monitoring Stack
- **prometheus.service** - Prometheus metrics collector (port 9090)
- **prometheus.yml** - Prometheus scraping configuration
- **grafana.service** - Grafana dashboard server (port 3002)
- **grafana.ini** - Grafana server configuration
- **grafana-datasource.yml** - Prometheus datasource for Grafana
- **grafana-dashboard-provider.yml** - Dashboard provisioning config
- **node_exporter.service** - Node metrics exporter (port 9100)

### Setup Scripts
- **setup-vps.sh** - Complete VPS setup (application + monitoring)
- **setup-monitoring.sh** - Standalone monitoring stack installer
- **setup-firewall.sh** - UFW firewall configuration
- **setup-cron.sh** - Auto-update cron job installer
- **auto-update-cron.sh** - Auto-update script (runs via cron)

### Configuration Templates
- **.env.local.template** - Frontend environment variables template

## 🚀 Quick Start - New Server Setup

### Prerequisites
- Fresh Ubuntu 20.04+ or Debian 11+ VPS
- Root access
- Domain pointed to server IP (for SSL)

### Step 1: Clone Repository
```bash
sudo mkdir -p /apps
cd /apps
sudo git clone https://github.com/bidyashish/vedicpanchanga.com panchanga
cd panchanga
```

### Step 2: Run Complete Setup
```bash
sudo bash infra/setup-vps.sh
```

This installs:
- Python backend with virtual environment
- Next.js frontend with production build
- Nginx reverse proxy
- Prometheus, Grafana, Node Exporter
- UFW firewall with proper ports
- Systemd services for all components

### Step 3: Configure SSL (After DNS Setup)
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d vedicpanchanga.com -d www.vedicpanchanga.com
```

### Step 4: Setup Auto-Updates (Optional)
```bash
sudo bash infra/setup-cron.sh
```

## 🔧 Manual Setup Components

### Application Only
```bash
# Backend
cd /apps/panchanga/backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
sudo cp infra/panchanga-backend.service /etc/systemd/system/
sudo systemctl enable --now panchanga-backend

# Frontend
cd /apps/panchanga/frontend
npm install
npm run build
cp infra/.env.local.template .env.local
sudo cp infra/panchanga-frontend.service /etc/systemd/system/
sudo systemctl enable --now panchanga-frontend

# Nginx
sudo cp infra/nginx-vedicpanchanga.conf /etc/nginx/sites-available/vedicpanchanga
sudo ln -sf /etc/nginx/sites-available/vedicpanchanga /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

### Monitoring Stack Only
```bash
sudo bash infra/setup-monitoring.sh
```

### Firewall Only
```bash
sudo bash infra/setup-firewall.sh
```

## 📊 Port Configuration

### Application Ports
- **80/tcp** - HTTP (redirects to HTTPS)
- **443/tcp** - HTTPS (public access)
- **3121/tcp** - Next.js frontend (internal)
- **8121/tcp** - FastAPI backend (localhost only)

### Monitoring Ports
- **3002/tcp** - Grafana (public access)
- **9090/tcp** - Prometheus (public access)
- **9100/tcp** - Node Exporter (public access)
- **8080/tcp** - cAdvisor (if installed)
- **9256/tcp** - Process Exporter (if installed)

### Blocked Ports
- **8000/tcp** - Old backend port (blocked by firewall)

## 🔒 Security Configuration

### Nginx Security Headers
- X-Frame-Options: SAMEORIGIN
- X-Content-Type-Options: nosniff
- X-XSS-Protection: 1; mode=block
- Strict-Transport-Security: max-age=31536000

### SSL/TLS
- TLS 1.2 and 1.3 only
- Strong cipher suites
- HSTS enabled

### Firewall Rules
- SSH (22) - Open
- HTTP/HTTPS (80/443) - Open
- Monitoring ports - Open (restrict in production if needed)
- Backend ports - Blocked from external access
- IP-based access - Blocked (444 error)

## 🔄 Auto-Update System

The auto-update script runs every 6 hours and:
1. Checks for new commits on main branch
2. Pulls latest code
3. Fixes file permissions
4. Updates backend dependencies
5. Rebuilds frontend
6. Restarts services
7. Logs all actions to `/var/log/panchanga-auto-update.log`

### Manual Update
```bash
sudo bash /apps/panchanga/infra/auto-update-cron.sh
```

### View Update Logs
```bash
tail -f /var/log/panchanga-auto-update.log
```

### Disable Auto-Updates
```bash
sudo crontab -e
# Comment out or delete the line containing: auto-update-cron.sh
```

## 📈 Monitoring Setup

### Access Grafana
1. Navigate to `http://YOUR_SERVER_IP:3002`
2. Login with credentials from setup output
3. Import dashboards:
   - Node Exporter Full: Dashboard ID 1860
   - Create custom dashboards for Panchanga metrics

### Prometheus Targets
Access `http://YOUR_SERVER_IP:9090/targets` to verify all scrapers are UP:
- Prometheus itself
- Node Exporter (system metrics)
- Grafana
- Panchanga Backend (if metrics endpoint exists)
- Nginx (if nginx-prometheus-exporter installed)

## 🛠️ Useful Commands

### Service Management
```bash
# Check status
sudo systemctl status panchanga-backend panchanga-frontend

# View logs
sudo journalctl -u panchanga-backend -f
sudo journalctl -u panchanga-frontend -f

# Restart services
sudo systemctl restart panchanga-backend panchanga-frontend

# Reload Nginx
sudo nginx -t && sudo systemctl reload nginx
```

### Monitoring Services
```bash
# Check monitoring stack
sudo systemctl status prometheus grafana-server node_exporter

# View Prometheus logs
sudo journalctl -u prometheus -f
```

### Debugging
```bash
# Check listening ports
sudo ss -tlnp | grep -E ':(3121|8121|3002|9090|9100)'

# Check firewall
sudo ufw status verbose

# Test backend
curl http://localhost:8121/

# Test frontend
curl http://localhost:3121/
```

## 📝 Customization

### Change Ports
Edit service files and update:
- `panchanga-backend.service` - Change `--port 8121`
- `panchanga-frontend.service` - Change `PORT=3121`
- `nginx-vedicpanchanga.conf` - Update proxy_pass URLs
- `.env.local` - Update `NEXT_PUBLIC_API_URL` and `PORT`

### Add Monitoring Targets
Edit `prometheus.yml` and add new job:
```yaml
- job_name: 'my-service'
  static_configs:
    - targets: ['localhost:PORT']
```
Then reload: `sudo systemctl reload prometheus`

### Change Auto-Update Schedule
```bash
sudo crontab -e
# Modify the schedule (cron format)
```

## 🚨 Troubleshooting

### Services Won't Start
```bash
# Check service logs
sudo journalctl -u panchanga-backend -n 50
sudo journalctl -u panchanga-frontend -n 50

# Check permissions
ls -la /apps/panchanga/backend/venv
ls -la /apps/panchanga/frontend/node_modules

# Fix permissions
sudo chown -R ubuntu:ubuntu /apps/panchanga
```

### Nginx Configuration Errors
```bash
# Test configuration
sudo nginx -t

# Check error log
sudo tail -f /var/log/nginx/error.log
```

### Monitoring Not Working
```bash
# Check if services are running
sudo systemctl status prometheus grafana-server node_exporter

# Verify ports are listening
sudo ss -tlnp | grep -E ':(3002|9090|9100)'

# Check firewall isn't blocking
sudo ufw status
```

## 📚 Additional Resources

- [Nginx Documentation](https://nginx.org/en/docs/)
- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [SystemD Service Files](https://www.freedesktop.org/software/systemd/man/systemd.service.html)

## 🔐 Production Hardening

Before going to production:

1. **Change default passwords** in `grafana.ini`
2. **Restrict monitoring ports** - Only allow from specific IPs
3. **Setup proper SSL certificates** - Use Let's Encrypt certbot
4. **Enable rate limiting** - Configure in Nginx
5. **Setup log rotation** - Configure logrotate
6. **Regular backups** - Setup automated backups
7. **Security updates** - Enable unattended-upgrades
8. **Monitoring alerts** - Configure Prometheus alertmanager

## 📞 Support

For issues related to:
- Application: See main project README
- Deployment: Check this document first
- Monitoring: Refer to Prometheus/Grafana docs

---

**Last Updated:** 2025-10-11
**Version:** 1.0
**Maintained by:** Vedic Panchanga Team
