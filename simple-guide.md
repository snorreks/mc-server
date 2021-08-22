ctr+d and replace the following:

{projectId}
{googleName}

# Setup

1. Create google account
2. Create Firebase project: https://console.firebase.google.com/
   1. Enable auth > email/password
   2. Enable firestore > eur3
   3. functions > get started
   4. create PWA app end copy config
   5. Add ss@onboardr.info
3. Go to GCP and setup free trial, select the firebase project and create a VM https://console.cloud.google.com/compute/instances

   1. Name: mc-server
   2. Zone: europa-west1-b
   3. Machine type: e2-standard-4 (or higher?)
   4. Boot disk > Change > Boot disk type: SSD

   5. Identity and API access > Set access for each API > Storage: Read Write
   6. Disks:
      1. Add new disk:
      2. Name: minecraft-disk
      3. Type: SSD Persistent Disk
      4. Size (GB): 50
   7. Networking:
      1. Network tags: minecraft-server
      2. Network interfaces > edit > External IP > Create IP address > name: mc-ip > done

4. Setup IP

   1. In GCP: search for VPC network
   2. Click "v default"
   3. Firewall rules > Add firewall rule
      1. Name: minecraft-rule
      2. Targets: Specified target tags
      3. Target tags: minecraft-server
      4. Source filter: IP ranges
      5. Source IP ranges: 0.0.0.0/0
      6. Protocols and ports: Specified protocols and ports: tcp:25565,8123

5. Open SSH:

   1. setup disk:

```script
sudo mkdir -p /home/minecraft
sudo mkfs.ext4 -F -E lazy_itable_init=0,lazy_journal_init=0,discard /dev/disk/by-id/google-minecraft-disk
sudo mount -o discard,defaults /dev/disk/by-id/google-minecraft-disk /home/minecraft
```

1. setup java:

- (if you run pre 1.13 verisons download java 8)

```script
sudo apt update
sudo apt install apt-transport-https ca-certificates wget dirmngr gnupg software-properties-common
wget -qO - https://adoptopenjdk.jfrog.io/adoptopenjdk/api/gpg/key/public | sudo apt-key add -
sudo add-apt-repository --yes https://adoptopenjdk.jfrog.io/adoptopenjdk/deb/
sudo apt update
sudo apt install adoptopenjdk-8-hotspot
#update-alternatives --config java
```

- (if pre 1.18)

```script
sudo apt-get update
sudo apt-get install -y default-jre-headless
```

- else

```script
sudo apt-get update
sudo apt-get install -y openjdk-16-jre-headless
```

3.  Setup minceraft folder

```script
cd /home/minecraft
sudo su
apt-get install -y screen
gsutil mb -b on -l europe-west1 gs://{projectId}-mc-backup
```

6.  Download Minecraft server (rename jar file to server.jar):

    - PaperMC:

           1. Download server.jar: https://papermc.io/downloads

           ```script
           mv ../{googleName}/server.jar .
           java -Xms1G -Xmx7G -jar server.jar nogui
           nano eula.txt
           ```

      java -Xms1G -Xmx7G -jar forg.jar nogui

    - Modpack:

      1. Download modpack and put it in "minecraft" folder in {projectId}-mc-backup: https://console.cloud.google.com/storage

      ```script
      gsutil cp -r gs://{projectId}-mc-backup/minecraft/* .
      ```

7.  (Optional):
    (upload server.properties and server-icon.png)

```script
mv ../{googleName}/server.properties .
mv ../{googleName}/server-icon.png .
```

9.  Setup backup script

```script
nano /home/minecraft/backup.sh
```

    - Add this:

```script
#!/bin/bash
base=gs://{projectId}-mc-backup/$(date "+%w")
screen -r mcs -X stuff '/save-all\n/save-off\n'
/usr/bin/gsutil rm ${base}/**
/usr/bin/gsutil cp -R ${BASH_SOURCE%/*}/world ${base}/world
/usr/bin/gsutil cp -R ${BASH_SOURCE%/*}/world_nether ${base}/world_nether
/usr/bin/gsutil cp -R ${BASH_SOURCE%/*}/world_the_end ${base}/world_the_end
screen -r mcs -X stuff '/save-on\n'
```

```script
chmod 755 /home/minecraft/backup.sh
```

8. Setup start and end script

   1. Go to the vm and click edit
   2. Custom metadata:

      - startup-script:

      ```script
      #!/bin/bash
      mount /dev/disk/by-id/google-minecraft-disk /home/minecraft
      (crontab -l ; echo "0 */4 * * * /home/minecraft/backup.sh")| crontab -
      cd /home/minecraft
      screen -d -m -S mcs java -Xms14G -Xmx14G -XX:+UseG1GC -XX:+ParallelRefProcEnabled -XX:MaxGCPauseMillis=200 -XX:+UnlockExperimentalVMOptions -XX:+DisableExplicitGC -XX:+AlwaysPreTouch -XX:G1NewSizePercent=40 -XX:G1MaxNewSizePercent=50 -XX:G1HeapRegionSize=16M -XX:G1ReservePercent=15 -XX:G1HeapWastePercent=5 -XX:G1MixedGCCountTarget=4 -XX:InitiatingHeapOccupancyPercent=20 -XX:G1MixedGCLiveThresholdPercent=90 -XX:G1RSetUpdatingPauseTimePercent=5 -XX:SurvivorRatio=32 -XX:+PerfDisableSharedMem -XX:MaxTenuringThreshold=1 -Dusing.aikars.flags=https://mcflags.emc.gs -Daikars.new.flags=true -jar server.jar nogui
      ```

      - shutdown-script:

      ```script
      #!/bin/bash
      sudo screen -r -X stuff 'stop\n'
      ```

9. Finish config in frontend and backend

- frontend/constants > change ipAddress
- functions/scripts/config > change projectId
- functions/src/controllers/vm/utils > change projectId

# Commands

Do all commands from 'minecraft' folder with su command:

```script
cd /home/minecraft
sudo su
```

- Move (mv [options] source dest)
  - Move from uploaded file to minecraft folder:

```script
mv ../{googleName}/{fileName} ./
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
gsutil cp -r . gs://{projectId}-mc-backup/minecraft
```

- Copy minecraft folder from storage to vm

1. Put your minecraft world in {projectId}-mc-backup: https://console.cloud.google.com/storage

```script
rm .
gsutil cp -r gs://{projectId}-mc-backup/minecraft/* .
chmod 755 /home/minecraft/backup.sh
```

- Copy worlds from a backup

```script
rm -r world
rm -r world_nether
rm -r world_the_end
gsutil cp -r gs://{projectId}-mc-backup/{date}/world .
gsutil cp -r gs://{projectId}-mc-backup/minecraft/world_nether .
gsutil cp -r gs://{projectId}-mc-backup/minecraft/world_the_end .

```

- Remove folder in storage

```script
gsutil rm gs://{projectId}-mc-backup/{dirName}/**
```
