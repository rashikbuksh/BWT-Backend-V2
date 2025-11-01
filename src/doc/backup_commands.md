# ZKTeco Device Full Backup Commands

## Using the Custom Command API

To take a full backup of a ZKTeco device, you can use the existing custom command endpoint:

### Endpoint

```
POST /iclock/device/custom-command?sn=YOUR_DEVICE_SERIAL
```

### Full Backup Commands

#### 1. Backup All User Information

```json
{
  "command": "C:1:DATA QUERY USERINFO"
}
```

#### 2. Backup All Attendance Logs

```json
{
  "command": "C:1:DATA QUERY ATTLOG"
}
```

#### 3. Backup Biometric Data (Fingerprints)

```json
{
  "command": "C:1:DATA QUERY BIODATA"
}
```

#### 4. Backup Face Templates

```json
{
  "command": "C:1:DATA QUERY BIOPHOTO"
}
```

#### 5. Backup Device Configuration

```json
{
  "command": "C:1:DATA QUERY OPTION"
}
```

#### 6. Backup User Roles/Privileges

```json
{
  "command": "C:1:DATA QUERY ROLE"
}
```

#### 7. Backup Department Information

```json
{
  "command": "C:1:DATA QUERY DEPT"
}
```

#### 8. Get Device Information

```json
{
  "command": "C:1:GET INFO"
}
```

## Complete Backup Script

You can send all these commands sequentially to get a complete backup:

```bash
# Replace YOUR_DEVICE_SERIAL with your actual device serial number
DEVICE_SN="YOUR_DEVICE_SERIAL"
BASE_URL="http://localhost:3007"

# 1. User Information
curl -X POST "${BASE_URL}/iclock/device/custom-command?sn=${DEVICE_SN}" \
  -H "Content-Type: application/json" \
  -d '{"command": "C:1:DATA QUERY USERINFO"}'

# 2. Attendance Logs
curl -X POST "${BASE_URL}/iclock/device/custom-command?sn=${DEVICE_SN}" \
  -H "Content-Type: application/json" \
  -d '{"command": "C:1:DATA QUERY ATTLOG"}'

# 3. Biometric Data
curl -X POST "${BASE_URL}/iclock/device/custom-command?sn=${DEVICE_SN}" \
  -H "Content-Type: application/json" \
  -d '{"command": "C:1:DATA QUERY BIODATA"}'

# 4. Face Templates
curl -X POST "${BASE_URL}/iclock/device/custom-command?sn=${DEVICE_SN}" \
  -H "Content-Type: application/json" \
  -d '{"command": "C:1:DATA QUERY BIOPHOTO"}'

# 5. Device Configuration
curl -X POST "${BASE_URL}/iclock/device/custom-command?sn=${DEVICE_SN}" \
  -H "Content-Type: application/json" \
  -d '{"command": "C:1:DATA QUERY OPTION"}'

# 6. User Roles
curl -X POST "${BASE_URL}/iclock/device/custom-command?sn=${DEVICE_SN}" \
  -H "Content-Type: application/json" \
  -d '{"command": "C:1:DATA QUERY ROLE"}'

# 7. Department Information
curl -X POST "${BASE_URL}/iclock/device/custom-command?sn=${DEVICE_SN}" \
  -H "Content-Type: application/json" \
  -d '{"command": "C:1:DATA QUERY DEPT"}'

# 8. Device Information
curl -X POST "${BASE_URL}/iclock/device/custom-command?sn=${DEVICE_SN}" \
  -H "Content-Type: application/json" \
  -d '{"command": "C:1:GET INFO"}'
```

## Monitoring the Backup

After sending these commands, you can monitor the progress using:

### Check Queue Status

```
GET /iclock/device/queue-status?sn=YOUR_DEVICE_SERIAL
```

### Check Device Health

```
GET /v1/iclock/device/health?sn=YOUR_DEVICE_SERIAL
```

## Notes

1. **Command Execution**: These commands are queued and executed when the device next polls the server
2. **Data Retrieval**: The backup data will be sent back to your server via the `/iclock/cdata` POST endpoint
3. **Storage**: The data is automatically stored in your database tables as configured in your system
4. **Timing**: Allow some time between commands to avoid overwhelming the device
5. **Large Datasets**: For devices with large amounts of data, consider backing up in smaller chunks using date ranges

## Advanced Backup with Date Ranges

For attendance logs, you can specify date ranges to manage large datasets:

```json
{
  "command": "C:1:DATA QUERY ATTLOG StartTime=2024-01-01 00:00:00 EndTime=2024-12-31 23:59:59"
}
```
