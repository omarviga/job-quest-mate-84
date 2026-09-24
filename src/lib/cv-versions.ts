export interface CvVersion {
  id: string;
  title: string;
  targetRole: string;
  lastModified: string; // ISO date
  content: string;
  isDefault?: boolean;
}

const CV_VERSIONS_STORAGE_KEY = "rumbo_cv_versions_v1";

export const DEFAULT_CV_VERSIONS: CvVersion[] = [
  {
    id: "cv-data-engineer-streaming",
    title: "Data Engineer — Streaming & Big Data",
    targetRole: "Senior Data Engineer",
    lastModified: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
    isDefault: true,
    content: `Lucía Ferrer
lucia.ferrer@email.com | +34 612 345 678 | Madrid, España | linkedin.com/in/luciaferrer

RESUMEN PROFESIONAL
Data Engineer con más de 5 años de experiencia diseñando, construyendo y optimizando pipelines de datos escalables (ETL/ELT), arquitecturas de lagos de datos (Data Lakehouse) y almacenes analíticos en la nube (AWS/GCP). Experta en Python, SQL avanzado, Apache Spark, dbt y orquestación con Apache Airflow. Orientada a la confiabilidad de datos y reducción de latencia en modelos de analítica y machine learning.

EXPERIENCIA LABORAL
Senior Data Engineer | DataSphere Corp (Madrid / Remoto) | 2022 - Actualidad
- Diseñé e implementé pipelines de ingesta en tiempo real y batch procesando más de 8 TB diarios utilizando Apache Spark, Kafka y AWS (S3, EMR, Redshift).
- Migré modelos analíticos a dbt y Snowflake, reduciendo los tiempos de ejecución de consultas en un 42% y los costos de cómputo en un 28%.
- Implementé controles de calidad de datos automatizados con Great Expectations y orquestación integral con Airflow / MWAA.

Data Engineer | Kestrel Analytics (Barcelona) | 2019 - 2022
- Construí pipelines ETL con Python y PySpark sobre Google Cloud Platform (BigQuery, Cloud Storage, Dataflow).
- Desarrollé modelos dimensionales (Kimball) para soportar dashboards de BI en Tableau y Looker con más de 200 usuarios activos.
- Colaboré con científicos de datos para desplegar características para modelos predictivos de churn y detección de anomalías.

HABILIDADES TÉCNICAS
- Lenguajes: Python, SQL (PostgreSQL, BigQuery, Snowflake), Bash
- Big Data & Procesamiento: Apache Spark (PySpark), Kafka, Databricks
- Orquestación & CI/CD: Apache Airflow, dbt, Docker, Git, Terraform
- Cloud Platforms: AWS (S3, EMR, Lambda, Redshift, Glue), GCP (BigQuery, Dataflow)
- Calidad de Datos & Pruebas: Great Expectations, Pytest

EDUCACIÓN
Grado en Ingeniería Informática | Universidad Politécnica de Madrid (2015 - 2019)`,
  },
  {
    id: "cv-analytics-engineer-bi",
    title: "Analytics Engineer — Modelado Semántico & BI",
    targetRole: "Analytics Engineer / BI Lead",
    lastModified: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
    isDefault: false,
    content: `Lucía Ferrer
lucia.ferrer@email.com | +34 612 345 678 | Madrid, España | linkedin.com/in/luciaferrer

RESUMEN PROFESIONAL
Analytics Engineer especializada en la capa semántica de datos, modelado dimensional (Kimball, Data Vault 2.0) y transformación robusta con dbt Core y Cloud. Con amplia experiencia unificando fuentes heterogéneas para alimentar métricas estratégicas, reportes ejecutivos en Tableau/Looker y habilitar self-service analytics a escala organizacional.

EXPERIENCIA LABORAL
Lead Analytics Engineer | DataSphere Corp | 2022 - Actualidad
- Lideré la migración del modelado semántico empresarial a dbt Cloud sobre Snowflake, creando más de 120 modelos con documentación y linaje automatizado.
- Diseñé la capa de métricas financieras y de retención (LTV, Churn, CAC) utilizada por el comité de dirección para evaluar el rendimiento de 4 mercados europeos.
- Establecí marcos de calidad de datos con dbt test y Great Expectations, elevando la confiabilidad de datos al 99.8%.

BI & Data Specialist | Kestrel Analytics | 2019 - 2022
- Diseñé y mantuve modelos dimensionales en Google BigQuery para alimentar tableros de BI en Looker y Tableau con más de 300 usuarios concurrentes.
- Escribí consultas complejas en SQL para análisis exploratorio, cohortes de usuarios y optimización del embudo de conversión de clientes.
- Impartí talleres internos de SQL y visualización de datos a equipos de Producto y Marketing.

HABILIDADES TÉCNICAS
- Transformación & Modelado: dbt (Core & Cloud), Kimball, Data Vault 2.0, Semantic Layer
- Almacenes Cloud: Snowflake, Google BigQuery, PostgreSQL
- Visualización & BI: Tableau, Looker, Metabase, Power BI
- Lenguajes: SQL avanzado (Window functions, CTEs, tuning), Python (Pandas, Polars), Jinja
- Gobernanza & Linaje: DataHub, dbt docs, Git, CI/CD para analítica

EDUCACIÓN Y CERTIFICACIONES
- dbt Certified Developer (2023)
- Grado en Ingeniería Informática | Universidad Politécnica de Madrid`,
  },
  {
    id: "cv-mlops-data-platform",
    title: "Data Platform Engineer — MLOps & Cloud",
    targetRole: "MLOps / Data Infrastructure Engineer",
    lastModified: new Date(Date.now() - 1000 * 60 * 60 * 24 * 12).toISOString(),
    isDefault: false,
    content: `Lucía Ferrer
lucia.ferrer@email.com | +34 612 345 678 | Madrid, España | linkedin.com/in/luciaferrer

RESUMEN PROFESIONAL
Data Platform & MLOps Engineer con sólida base en infraestructura en la nube, automatización de CI/CD para pipelines de datos y despliegue de sistemas de Machine Learning en producción. Experta en Kubernetes, Terraform, AWS, observabilidad de datos (Monte Carlo) y orquestación con Apache Airflow / Kubeflow.

EXPERIENCIA LABORAL
Data Platform & MLOps Engineer | DataSphere Corp | 2022 - Actualidad
- Administré clústeres de Kubernetes (EKS) y Terraform para el despliegue de cargas de trabajo de analítica y entrenamiento de modelos predictivos.
- Implementé una arquitectura de observabilidad integral de datos con Monte Carlo y Prometheus, reduciendo el tiempo medio de detección de anomalías (MTTD) de 4 horas a 12 minutos.
- Diseñé un Feature Store centralizado (Feast) para acelerar el ciclo de vida de experimentación a producción de modelos de recomendación.

Infrastructure & Cloud Data Engineer | Kestrel Analytics | 2019 - 2022
- Automaticé el aprovisionamiento de infraestructura de datos en GCP con Terraform y Ansible.
- Construí pipelines de CI/CD en GitHub Actions para el empaquetado y prueba automática de contenedores Docker con aplicaciones PySpark.
- Gestioné políticas de IAM, cifrado de datos en reposo y tránsito conforme al marco de seguridad SOC2 y GDPR.

HABILIDADES TÉCNICAS
- Plataforma & Contenedores: Kubernetes (K8s), Docker, Helm, Argo Workflows
- Infraestructura como Código: Terraform, AWS CloudFormation, GitOps
- Observabilidad & MLOps: Monte Carlo, Prometheus, Grafana, MLflow, Feast
- Cloud: AWS (EKS, S3, IAM, CloudWatch, MWAA), GCP (GKE, BigQuery)
- Lenguajes: Python, Go (básico), SQL, Bash scripting

EDUCACIÓN Y CERTIFICACIONES
- AWS Certified Solutions Architect – Associate
- Grado en Ingeniería Informática | Universidad Politécnica de Madrid`,
  },
];

export function getSavedCvVersions(): CvVersion[] {
  if (typeof window === "undefined") return DEFAULT_CV_VERSIONS;
  try {
    const raw = localStorage.getItem(CV_VERSIONS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(CV_VERSIONS_STORAGE_KEY, JSON.stringify(DEFAULT_CV_VERSIONS));
      return DEFAULT_CV_VERSIONS;
    }
    const parsed = JSON.parse(raw) as CvVersion[];
    if (!Array.isArray(parsed) || parsed.length === 0) {
      localStorage.setItem(CV_VERSIONS_STORAGE_KEY, JSON.stringify(DEFAULT_CV_VERSIONS));
      return DEFAULT_CV_VERSIONS;
    }
    return parsed;
  } catch (err) {
    console.error("Error loading CV versions from localStorage:", err);
    return DEFAULT_CV_VERSIONS;
  }
}

export function saveCvVersion(
  version: Omit<CvVersion, "id" | "lastModified"> & { id?: string },
): CvVersion[] {
  const current = getSavedCvVersions();
  const now = new Date().toISOString();

  let updated: CvVersion[];
  if (version.id) {
    // Update existing
    updated = current.map((item) =>
      item.id === version.id
        ? {
            ...item,
            title: version.title.trim(),
            targetRole: version.targetRole.trim(),
            content: version.content,
            lastModified: now,
          }
        : item,
    );
  } else {
    // Create new
    const newVersion: CvVersion = {
      id: `cv-version-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      title: version.title.trim() || "Nueva Versión de CV",
      targetRole: version.targetRole.trim() || "General",
      lastModified: now,
      content: version.content,
      isDefault: false,
    };
    updated = [newVersion, ...current];
  }

  try {
    localStorage.setItem(CV_VERSIONS_STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error("Error saving CV version to localStorage:", err);
  }

  return updated;
}

export function deleteCvVersion(id: string): CvVersion[] {
  const current = getSavedCvVersions();
  const updated = current.filter((item) => item.id !== id);
  try {
    localStorage.setItem(CV_VERSIONS_STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error("Error deleting CV version:", err);
  }
  return updated;
}

export function resetDefaultCvVersions(): CvVersion[] {
  try {
    localStorage.setItem(CV_VERSIONS_STORAGE_KEY, JSON.stringify(DEFAULT_CV_VERSIONS));
  } catch (err) {
    console.error("Error resetting CV versions:", err);
  }
  return DEFAULT_CV_VERSIONS;
}
