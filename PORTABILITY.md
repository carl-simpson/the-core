# Portability Guide - Moving to Another Machine

This folder is **100% self-contained** and designed to be moved between machines (macOS → Linux → Windows).

## 🎯 What's Special About This Setup

### **All Data Lives in This Folder**

```
/Volumes/External/magento-core/    ← External drive
├── docker-data/                   ← Neo4j data (NOT in Docker volumes)
│   ├── neo4j/
│   │   ├── data/                  ← Database files
│   │   ├── logs/                  ← Query logs
│   │   └── import/                ← Import directory
│   └── composer/                  ← PHP parser cache
├── data/                          ← Parsed JSON graphs
├── diagrams/                      ← Generated diagrams
├── snapshots/                     ← Full state backups
└── backups/                       ← Incremental backups
```

**Why this matters**:
- ✅ Disconnect external drive → Plug into new machine → Everything works
- ✅ No Docker volume migration needed
- ✅ No data loss when wiping machine
- ✅ Cross-platform compatible

---

## 📦 Before Leaving This Machine

### Step 1: Create Final Snapshot

```bash
cd /Volumes/External/magento-core

# Create timestamped snapshot of all data
./scripts/snapshot-create.sh
```

This creates:
```
snapshots/20251203_143000/
├── neo4j-data.tar.gz         # Neo4j database
├── parsed-data.tar.gz        # Parsed Magento graphs
├── diagrams.tar.gz           # Generated visualizations
├── .env                      # Configuration
└── manifest.txt              # Restore instructions
```

### Step 2: Stop Docker Services

```bash
npm run docker:down
```

### Step 3: Verify Backup

```bash
ls -lh snapshots/
# Should show timestamped directory with .tar.gz files
```

### Step 4: Disconnect External Drive

```bash
# Safely eject the drive
diskutil eject /Volumes/External
```

---

## 🚀 On New Linux Machine

### Step 1: Prerequisites

```bash
# Install Docker
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
# Log out and back in

# Install Docker Compose
sudo apt install docker-compose -y

# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
```

### Step 2: Mount External Drive

```bash
# Plug in external drive
# Mount it (adjust /dev/sdX to your drive)
sudo mkdir -p /mnt/external
sudo mount /dev/sdX1 /mnt/external

# Or if auto-mounted:
cd /media/$USER/YOUR_DRIVE_NAME/magento-core
```

### Step 3: Setup

```bash
cd /mnt/external/magento-core  # or wherever it mounted

# Run setup script
./scripts/setup.sh
```

This will:
- ✅ Check Node.js and Docker versions
- ✅ Install npm dependencies
- ✅ Verify Docker is running

### Step 4: Configure for New Machine

```bash
# Copy environment template
cp .env.example .env

# Edit for Linux paths
nano .env
```

**Update**:
```env
# Point to Magento on THIS machine
MAGENTO_PATH=/var/www/magento2

# Or if you're mounting the external drive's Magento:
MAGENTO_PATH=/mnt/external/magento2
```

### Step 5: Restore Latest Snapshot

```bash
# List available snapshots
ls -1 snapshots/

# Restore the latest one
./scripts/snapshot-restore.sh 20251203_143000

# This will:
# - Restore Neo4j database
# - Restore parsed data
# - Restore diagrams
# - Restore .env (with warning to update MAGENTO_PATH)
```

### Step 6: Start Services

```bash
# Start Docker containers
npm run docker:up

# Wait ~30 seconds for Neo4j to be ready
# You'll see: "✅ All services are running!"
```

### Step 7: Verify Everything Works

```bash
# Initialize and check
npm start -- init

# Should show:
# ✅ Node.js version: v18.x.x
# ✅ Docker running
# ✅ Neo4j accessible
```

### Step 8: Test with a Query

```bash
# If you had parsed data, test it
npm start -- query "MATCH (n:Module) RETURN n.name LIMIT 5"

# Or parse a fresh module
npm start -- parse Magento_Customer
```

---

## 🔄 Daily Workflow on Linux

### Working Session

```bash
# 1. Start services
cd /mnt/external/magento-core
npm run docker:up

# 2. Do work (parse, query, analyze)
npm start -- parse Magento_Catalog

# 3. Create snapshot (every few hours)
./scripts/snapshot-create.sh

# 4. End of day - stop services
npm run docker:down
```

### If You Change Machines Again

```bash
# Before unmounting drive
./scripts/snapshot-create.sh
npm run docker:down

# Safely eject
sudo umount /mnt/external
```

---

## 🐳 Docker Data Explained

### Why No Docker Volumes?

**Traditional Docker** (BAD for portability):
```yaml
volumes:
  - neo4j-data:/data  # Stored in /var/lib/docker/volumes/
```
❌ Data stays on host machine
❌ Lost when machine wiped
❌ Hard to backup/restore

**Our Setup** (GOOD for portability):
```yaml
volumes:
  - ../docker-data/neo4j/data:/data  # Stored in OUR folder
```
✅ Data in external drive folder
✅ Survives machine wipe
✅ Easy backup/restore
✅ Cross-platform

### Docker Data Locations

**On This Machine**:
```
/Volumes/External/magento-core/docker-data/
├── neo4j/
│   ├── data/          # Graph database files
│   ├── logs/          # Neo4j logs
│   ├── import/        # CSV import staging
│   └── plugins/       # Neo4j plugins (if any)
└── composer/          # PHP parser Composer cache
```

**On Linux**:
```
/mnt/external/magento-core/docker-data/
# (Same structure, different mount point)
```

---

## 📊 Snapshot vs Backup

### Snapshot (Full State)

```bash
./scripts/snapshot-create.sh
```

- **What**: Complete point-in-time backup
- **Includes**: Neo4j DB, parsed data, diagrams, config
- **When**: Before machine change, after major work
- **Size**: ~100MB - 1GB depending on data

### Incremental Backup (Neo4j Only)

```bash
./scripts/backup-neo4j.sh
```

- **What**: Just the Neo4j database
- **Includes**: Graph data only
- **When**: During active development (hourly)
- **Size**: ~50MB - 500MB

### When to Use Each

| Scenario | Use This |
|----------|----------|
| Changing machines | `snapshot-create.sh` |
| End of work session | `snapshot-create.sh` |
| During development (save progress) | `backup-neo4j.sh` |
| Before risky operation | `snapshot-create.sh` |
| Machine wipe tomorrow | `snapshot-create.sh` |

---

## 🔧 Troubleshooting on New Machine

### "Docker not found"

```bash
# Install Docker
curl -fsSL https://get.docker.com | sudo sh
sudo systemctl start docker
sudo systemctl enable docker
```

### "Permission denied" on Linux

```bash
# Add user to docker group
sudo usermod -aG docker $USER

# Log out and back in, then:
docker ps  # Should work without sudo
```

### "Neo4j won't start"

```bash
# Check logs
cd docker
docker-compose logs neo4j

# Common issue: permissions on data directory
sudo chown -R 7474:7474 ../docker-data/neo4j/data
```

### "MAGENTO_PATH not found"

```bash
# Update .env
nano .env

# Set correct path on new machine
MAGENTO_PATH=/path/to/magento2
```

### "npm install fails"

```bash
# Clear npm cache
npm cache clean --force

# Remove node_modules
rm -rf node_modules

# Reinstall
npm install
```

---

## 🎯 Cross-Platform Notes

### macOS → Linux

- ✅ Works perfectly
- Update: `MAGENTO_PATH` in `.env`
- Update: File permissions may need `chmod` on scripts

### macOS → Windows (WSL2)

- ✅ Works with WSL2 + Docker Desktop
- Update: Convert paths (`/mnt/d/magento-core` instead of `/Volumes/External`)
- Update: Line endings (run `dos2unix scripts/*.sh` if needed)

### Linux → macOS

- ✅ Works perfectly
- Update: `MAGENTO_PATH` in `.env`
- Note: macOS may quarantine scripts (right-click → Open to bypass)

---

## 📝 Complete Migration Checklist

**Before Leaving Current Machine**:
- [ ] Run `./scripts/snapshot-create.sh`
- [ ] Run `npm run docker:down`
- [ ] Verify snapshot exists: `ls -lh snapshots/`
- [ ] Safely eject external drive

**On New Machine**:
- [ ] Install Docker & Node.js 18+
- [ ] Mount external drive
- [ ] Run `./scripts/setup.sh`
- [ ] Update `.env` with new `MAGENTO_PATH`
- [ ] Run `./scripts/snapshot-restore.sh <timestamp>`
- [ ] Run `npm run docker:up`
- [ ] Verify: `npm start -- init`
- [ ] Test: `npm start -- parse Magento_Customer`

---

## 🚨 Emergency Recovery

### If Snapshot Corrupted

```bash
# Neo4j data is in docker-data/ - it's NOT lost!
cd docker-data/neo4j/data

# Start fresh Neo4j and import this data
npm run docker:up
```

### If Config Lost

```bash
# Recreate from template
cp .env.example .env
nano .env  # Configure manually
```

### If Code Modified

```bash
# All code is in git-ready state
git status  # Check what changed
git diff    # Review changes
```

---

## 💡 Pro Tips

1. **Create snapshot every 4 hours** during active development
2. **Keep last 3 snapshots** on external drive (delete older ones)
3. **Test restore** on same machine before migrating
4. **Document custom changes** in notes.txt
5. **Update .env** immediately on new machine

---

**Ready to migrate?** Follow the checklist above and you'll be up and running on Linux in 10 minutes! 🚀
