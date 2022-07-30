ctr+d and replace the following:

{projectId}
{googleName}

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
   3. Machine type: e2-standard-4
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

4. Setup IP

   1. In GCP: search for VPC network
   2. Click "v default"
   3. Firewall rules > Add firewall rule
      1. Name: minecraft-rule
      2. Targets: Specified target tags
      3. Target tags: minecraft-server
      4. Source filter: IP ranges
      5. Source IP ranges: 0.0.0.0/0
      6. Protocols and ports: Specified protocols and ports: tcp:25565

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
```

- else
  https://www.linuxcapable.com/how-to-install-java-17-lts-jdk-17-on-ubuntu-20-04/

```script
sudo su
apt-get install software-properties-common
apt-get update
apt-get install -y openjdk-16-jre-headless
#sudo apt-get install -y default-jre-headless
```

3.  Setup minceraft folder:
    https://minecraft.fandom.com/wiki/Server.properties

```script
cd /home/minecraft
sudo su
apt-get install -y screen
cd /home/minecraft
apt-get install -y screen
gsutil mb gs://{projectId}-minecraft-backup
```

6. Download Minecraft server (rename jar file to server.jar):

   - PaperMC:

     1. Download server.jar: https://papermc.io/downloads

     ```script
     mv ../{googleName}/server.jar ./
     ```

   - ModPack:

     1. Download forge installer and call it forge.jar: https://files.minecraftforge.net/net/minecraftforge/forge/index_1.12.2.html

     ```script
     mv ../{googleName}/forge.jar ./
     java -jar forge.jar --installServer
     ```

     1. (Optional) Download sponge and move to mods folder: https://www.spongepowered.org/downloads/spongeforge/stable/1.12.2

   - ModPack:

     1. Download modpack zip and call it pack.zip

     ```script
     mv ../{googleName}/pack.zip ./
     apt install unzip
     unzip pack.zip
     ```

7. Start server and setup config

```script
   java -Xms1G -Xmx7G -jar server.jar nogui
   nano eula.txt
   nano server.properties
```

7. Setup backup script

```script
nano /home/minecraft/backup.sh
```

Enter this text

```script
#!/bin/bash
screen -r mcs -X stuff '/save-all\n/save-off\n'
/usr/bin/gsutil cp -R ${BASH_SOURCE%/*}/world gs://<bucket>/$(date "+%Y%m%d-%H%M%S")-world
screen -r mcs -X stuff '/save-on\n'
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
screen -d -m -S mcs java -Xms1G -Xmx7G -d64 -jar minecraft_server.1.11.jar nogui
```

- startup-script:

```script
#!/bin/bash
sudo screen -r -X stuff '/stop\n'
```

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


- Copy minecraft worlds from vm to storage

```script
gsutil -m cp -r world gs://meingraf421-mc-backup/backup/world
gsutil -m cp -r world_nether gs://meingraf421-mc-backup/backup/world_nether
gsutil -m cp -r world_the_end gs://meingraf421-mc-backup/backup/world_the_end

```

gsutil -m cp -r gs://meingraf421-mc-backup/backup .

- Copy saved minecraft

1. Put your minecraft world in {projectId}-md-backup: https://console.cloud.google.com/storage

```script
gsutil cp -r gs://{projectId}-mc-backup/minecraft/* .
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

- Best startup script

https://aikar.co/2018/07/02/tuning-the-jvm-g1gc-garbage-collector-flags-for-minecraft/

# Notes

terraform? and
https://docs.google.com/document/d/1TXyzHKqoKMS-jY9FSMrYNLEGathqSG8YuHdj0Z9GP34/edit#heading=h.srqzwwxtrmar

https://github.com/itzg/docker-minecraft-server

https://www.geeksforgeeks.org/google-cloud-platform-setting-up-a-game-server/
Replce {project-id} and

gcloud beta compute --project=qwiklabs-gcp-04-f7bbc9a0604c instances create mc-server
--zone=europe-west-1-b --machine-type=e2-medium --subnet=default --address=35.232.183.36
--network-tier=PREMIUM --maintenance-policy=MIGRATE
--service-account=875541841397-compute@developer.gserviceaccount.com
--scopes=https://www.googleapis.com/auth/servicecontrol,https://www.googleapis.com/auth/service.management.readonly,https://www.googleapis.com/auth/logging.write,https://www.googleapis.com/auth/monitoring.write,https://www.googleapis.com/auth/trace.append,https://www.googleapis.com/auth/devstorage.read_write --tags=minecraft-server --image=debian-9-stretch-v20201216 --image-project=debian-cloud --boot-disk-size=10GB --boot-disk-type=pd-standard --boot-disk-device-name=mc-server --create-disk=mode=rw,size=50,type=projects/qwiklabs-gcp-04-f7bbc9a0604c/zones/us-central1-a/diskTypes/pd-ssd,name=minecraft-disk,device-name=minecraft-disk --reservation-affinity=any

sudo mkdir -p /home/minecraft

sudo mkfs.ext4 -F -E lazy_itable_init=0,\
lazy_journal_init=0,discard \
/dev/disk/by-id/google-minecraft-disk

sudo mount -o discard,defaults /dev/disk/by-id/google-minecraft-disk /home/minecraft

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