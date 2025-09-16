Replace:

- {projectId} with your project id
- {accountName} with your google account name

1. Create google account
2. Create Firebase project: https://console.firebase.google.com/
   1. Enable auth > email/password
   2. Enable firestore > eur3
   3. Enable Storage
   4. Functions > get started
   5. Create PWA app end copy config -> constant.ts
   6. Add your account in users settings
3. Go to GCP and setup free trial, select the firebase project and create a VM https://console.cloud.google.com/compute/instances
   1. Name: mc-server
   2. Zone: europa-west1-b
   3. Machine type: n2-highmem-2
   4. Boot disk > Change > Boot disk type: SSD

   5. Identity and API access
      1. Service account: Compute Engine default service account
      2. Access scopes: Set access for each API
         1. Storage: Read Write
   6. Disks:
      1. Add new disk:
      2. Name: minecraft-disk
      3. Type: SSD Persistent Disk
      4. Source type: Blank disk
      5. Size (GB): 50
   7. Networking:
      1. Network tags: minecraft-server
      2. Network interfaces > edit:
         1. External IP > Create IP address > name: mc-ip > done

4. Setup Firewall rule
   1. In GCP: search for VPC network
   2. Click "v default"
   3. Firewall rules > Add firewall rule
      1. Name: minecraft-rule
      2. Targets: Specified target tags
      3. Target tags: minecraft-server
      4. Source filter: IP ranges
      5. Source IP ranges: 0.0.0.0/0
      6. Protocols and ports:
         - tcp:25565,8123,8100
         - udp:24454

5. Open SSH:
   1. setup disk:

   ```script
   sudo su
   apt-get install -y screen
   mkdir -p /home/minecraft
   mkfs.ext4 -F -E lazy_itable_init=0,lazy_journal_init=0,discard /dev/disk/by-id/google-minecraft-disk
   mount -o discard,defaults /dev/disk/by-id/google-minecraft-disk /home/minecraft
   ```

   2. setup java https://docs.papermc.io/misc/java-install#ubuntudebian

   3. Upload files from vm-files into /home/minecraft

   4. Download Minecraft server (rename jar file to server.jar):
   - PaperMC:
     1. Download server.jar: https://papermc.io/downloads

     ```script
     mv ../{accountName}/server.jar ./
     ```
   5. Start server to test

   ```script
      java -Xms1G -Xmx7G -jar server.jar nogui
   ```

6. Close vm and add startup and shutdown script in custom metadata
   - startup-script:

   ```bash
   #!/bin/bash
   # Mount the additional SSD data disk
   mount /dev/disk/by-id/google-minecraft-disk /home/minecraft
   # Run backup.sh every 4 hour
   (crontab -l | grep -v '/home/minecraft/backup.sh'; echo "0 _/4 _ \* \* /home/minecraft/backup.sh") | crontab -
   # Start the Minecraft server in a detached screen session with logging
   cd /home/minecraft
   screen -d -m -S mcs java -Xms14336M -Xmx14336M server.jar nogui
   ```

   Get full startup script here https://docs.papermc.io/misc/tools/start-script-gen
   - shutdown-script:

   ```bash
   #!/bin/bash
   sudo screen -r -X stuff '/stop\n'
   ```

7. Deploy pwa and functions:
   1. Go to .firebaserc and replace project id
   2. Go to constants and change the variables
   3. Run
   ```
   deno install
   deno run setup
   deno run deploy
   ```

# Plugins

-mcmmp
https://popicraft.net/jenkins/job/mcMMO/

-discordsrv
https://www.spigotmc.org/resources/discordsrv.18494/

-dynmap
http://www.dynmap.us/builds/dynmap/?C=M;O=D

- bettersleeping

- minablespawners

- luckperms

- sickle

- imageonmap

- chestsort

# Commands

Do all commands from 'minecraft' folder with su command:

```script
cd /home/minecraft
sudo su
```

- Move (mv [options] source dest)
  - Move from uploaded file to minecraft folder:

```script
mv ../{accountName}/{fileName} ./
```

- Remove file

```script
rm {fileName}
```

- Remove folder

```script
rm -r {folderName}
```

- Copy minecraft folder from vm to storage

```script
gsutil cp -r . gs://{projectId}.appspot.com/minecraft
```

- Copy minecraft worlds from vm to storage

```script
gsutil -m cp -r world gs://{projectId}.appspot.com/backup/world
gsutil -m cp -r world_nether gs://{projectId}.appspot.com/backup/world_nether
gsutil -m cp -r world_the_end gs://{projectId}.appspot.com/backup/world_the_end

```

gsutil -m cp -r gs://{projectId}.appspot.com/backup .

- Copy saved minecraft

1. Put your minecraft world in {projectId}-md-backup: https://console.cloud.google.com/storage

```script
gsutil cp -r gs://{projectId}.appspot.com/minecraft/* .
```

- Copy worlds from a backup

```script
rm -r world
rm -r world_nether
rm -r world_the_end
gsutil cp -r gs://{projectId}.appspot.com/{date}/world .
gsutil cp -r gs://{projectId}.appspot.com/minecraft/world_nether .
gsutil cp -r gs://{projectId}.appspot.com/minecraft/world_the_end .

```

- Remove folder in storage

```script
gsutil rm gs://{projectId}.appspot.com/{dirName}/**
```

- Best startup script

https://aikar.co/2018/07/02/tuning-the-jvm-g1gc-garbage-collector-flags-for-minecraft/

# Notes

terraform? and
https://docs.google.com/document/d/1TXyzHKqoKMS-jY9FSMrYNLEGathqSG8YuHdj0Z9GP34/edit#heading=h.srqzwwxtrmar

https://github.com/itzg/docker-minecraft-server

https://www.geeksforgeeks.org/google-cloud-platform-setting-up-a-game-server/
