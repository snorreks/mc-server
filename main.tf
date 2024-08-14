variable "project_id" {
  description = "The Google Cloud Project ID that will host and pay for your Minecraft server"
  type        = string
  default     = ""  # Replace with your default project ID
}

variable "region" {
  description = "The Google Cloud region where resources will be created"
  type        = string
  default     = "europe-west1"  # Replace with your default region
}

variable "zone" {
  description = "The Google Cloud zone where resources will be created"
  type        = string
  default     = "europe-west1-b"
}

variable "bucket_name" {
  description = "The name of the storage bucket"
  type        = string
  default     = ".appspot.com"
}

variable "project_name" {
  description = "The name of the project"
  type        = string
  default     = "MineCraft Server"
}

variable "billing_account_id" {
  description = "The billing account id"
  type        = string
  default     = ""
}

variable "curse_forge_api_key" {
  description = "The CurseForge API key"
  type        = string
  default     = ""
}

# Configure the Terraform backend to store state in a Google Cloud Storage bucket
terraform {
  backend "gcs" {
    prefix = "minecraft/state"
    bucket = ".appspot.com"
  }
}

provider "google-beta" {
  project = var.project_id
  region  = var.region
  # Configures the provider to use the resource block's specified project for quota checks.
  user_project_override = true
}

provider "google-beta" {
  alias = "no_user_project_override"
  user_project_override = false
}

# Creates a new Google Cloud project.
resource "google_project" "default" {
  provider   = google-beta.no_user_project_override
  name       = var.project_name
  project_id = var.project_id
  billing_account = var.billing_account_id

  # Required for the project to display in any list of Firebase projects.
  labels = {
    "firebase" = "enabled"
  }
}

# Enables required APIs.
resource "google_project_service" "default" {
  provider = google-beta.no_user_project_override
  project  = var.project_id
  for_each = toset([
    "cloudbilling.googleapis.com",
    "cloudresourcemanager.googleapis.com",
    "firebase.googleapis.com",
    # Enabling the ServiceUsage API allows the new project to be quota checked from now on.
    "serviceusage.googleapis.com",
  ])
  service = each.key
  disable_on_destroy = false
}

resource "google_service_account" "minecraft" {
  account_id   = "minecraft"
  display_name = "minecraft"
  project      = var.project_id
}

resource "google_compute_disk" "minecraft" {
  name  = "minecraft"
  type  = "pd-standard"
  zone  = var.zone
  image = "cos-cloud/cos-stable"
  project = var.project_id
}

resource "google_compute_address" "minecraft" {
  name   = "minecraft-ip-address"
  region = var.region
  project = var.project_id
}

resource "google_compute_instance" "minecraft" {
  name         = "minecraft"
  project      = var.project_id
  machine_type = "e2-standard-4" # 4 vCPUs, 16 GB memory
  zone         = var.zone
  tags         = ["minecraft"]

  metadata_startup_script = <<-EOT
    #!/bin/bash

    # Create the backup cron job directly
    (crontab -l 2>/dev/null; echo "0 */4 * * * /usr/bin/docker exec mc /bin/bash -c 'screen -r mc -X stuff \"save-all\nsave-off\n\" && /usr/bin/gsutil cp -R /data /data/$(date \"+%Y%m%d-%H%M%S\")-world && screen -r mc -X stuff \"save-on\n\"'") | crontab -

    # Run Minecraft server
    docker run -d -p 25565:25565 -e EULA=TRUE -e VERSION=1.12.2 -e MEMORY=8G -e CF_API_KEY='${var.curse_forge_api_key}' -e TYPE=AUTO_CURSEFORGE -e CF_PAGE_URL=https://www.curseforge.com/minecraft/modpacks/valhelsia-6 -v /home/minecraft:/data --name mc --rm=true itzg/minecraft-server:latest
  EOT

  metadata = {
    enable-oslogin = "TRUE"
    shutdown_script = <<-EOT
      #!/bin/bash
      sudo screen -r -X stuff '/stop\n'
    EOT
  }

  boot_disk {
    auto_delete = false
    source      = google_compute_disk.minecraft.self_link
  }

  network_interface {
    network = google_compute_network.minecraft.name
    access_config {
      nat_ip = google_compute_address.minecraft.address
    }
  }

  service_account {
    email  = google_service_account.minecraft.email
    scopes = ["userinfo-email"]
  }

  scheduling {
    automatic_restart = false
  }

  lifecycle {
    create_before_destroy = true
  }
}

resource "google_compute_network" "minecraft" {
  name = "minecraft"
  project = var.project_id
}

resource "google_compute_firewall" "minecraft" {
  name    = "minecraft"
  project = var.project_id
  network = google_compute_network.minecraft.name

  allow {
    protocol = "tcp"
    ports    = ["25565"]
  }

  allow {
    protocol = "icmp"
  }

  allow {
    protocol = "tcp"
    ports    = ["22"]
  }

  source_ranges = ["0.0.0.0/0"]
  target_tags   = ["minecraft"]
}

# Enables Firebase services for the new project created above.
resource "google_firebase_project" "default" {
  provider = google-beta
  project  = var.project_id

  # Waits for the required APIs to be enabled.
  depends_on = [
    google_project_service.default
  ]
}

# resource "google_firestore_database" "default" {
#   name        = "(default)"
#   project     = var.project_id
#   location_id = var.region
#   type        = "FIRESTORE_NATIVE"
# }

resource "google_firebase_storage_bucket" "default" {
  provider  = google-beta
  project   = var.project_id
  bucket_id = var.bucket_name
}

resource "google_identity_platform_config" "default" {
  provider = google-beta
  project  = var.project_id
  sign_in {
    email {
      enabled = true
      password_required = true
    }
  }
}
