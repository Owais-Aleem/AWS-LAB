pipeline {
  agent any
  environment {
    AWS_ACCOUNT_ID   = credentials('aws-account-id-text')        // string credential (or set directly)
    AWS_ACCESS_KEY_ID     = credentials('aws-access-key-id')      // Jenkins credentials (secret text)
    AWS_SECRET_ACCESS_KEY = credentials('aws-secret-access-key')  // Jenkins credentials (secret text)
    AWS_REGION = 'ap-south-1'           // e.g. ap-south-1 (Mumbai) close to Pakistan
    ECR_FRONTEND = "employee-frontend"
    ECR_BACKEND  = "employee-backend"
    ECR_DB       = "employee-db"
    ECS_CLUSTER  = "emp-cluster"
    ECS_SERVICE  = "emp-service"
    EXECUTION_ROLE_ARN = "arn:aws:iam::<account-id>:role/ecsTaskExecutionRole"
    TASK_ROLE_ARN      = "arn:aws:iam::<account-id>:role/ecsTaskRole"
    LOG_GROUP          = "/ecs/employee-app"
  }
  options { timestamps() }
  stages {
    stage('Checkout') {
      steps { checkout scm }
    }
    stage('Set Version') {
      steps {
        script {
          env.IMAGE_TAG = sh(returnStdout: true, script: "git rev-parse --short HEAD").trim()
        }
      }
    }
    stage('AWS Login to ECR') {
      steps {
        sh '''
          aws configure set aws_access_key_id "$AWS_ACCESS_KEY_ID"
          aws configure set aws_secret_access_key "$AWS_SECRET_ACCESS_KEY"
          aws configure set default.region "$AWS_REGION"
          aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com
        '''
      }
    }
    stage('Build Images') {
      steps {
        sh '''
          docker build -t $ECR_FRONTEND:$IMAGE_TAG ./frontend
          docker build -t $ECR_BACKEND:$IMAGE_TAG  ./backend
          docker build -t $ECR_DB:$IMAGE_TAG       ./db
        '''
      }
    }
    stage('Tag + Push to ECR') {
      steps {
        sh '''
          for REPO in $ECR_FRONTEND $ECR_BACKEND $ECR_DB; do
            docker tag $REPO:$IMAGE_TAG $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$REPO:$IMAGE_TAG
            docker tag $REPO:$IMAGE_TAG $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$REPO:latest
            aws ecr describe-repositories --repository-names $REPO >/dev/null 2>&1 || aws ecr create-repository --repository-name $REPO
            docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$REPO:$IMAGE_TAG
            docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$REPO:latest
          done
        '''
      }
    }
    stage('Render Task Definition') {
      steps {
        sh '''
          sed -e "s|__FRONTEND_IMAGE__|$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_FRONTEND:$IMAGE_TAG|g" \
              -e "s|__BACKEND_IMAGE__|$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_BACKEND:$IMAGE_TAG|g" \
              -e "s|__DB_IMAGE__|$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_DB:$IMAGE_TAG|g" \
              -e "s|__EXECUTION_ROLE_ARN__|$EXECUTION_ROLE_ARN|g" \
              -e "s|__TASK_ROLE_ARN__|$TASK_ROLE_ARN|g" \
              -e "s|__LOG_GROUP__|$LOG_GROUP|g" \
            taskdef.template.json > taskdef.json
        '''
      }
    }
    stage('Register TaskDef + Update Service') {
      steps {
        sh '''
          TASK_ARN=$(aws ecs register-task-definition --cli-input-json file://taskdef.json --query 'taskDefinition.taskDefinitionArn' --output text)
          echo "New TaskDef: $TASK_ARN"
          aws ecs update-service --cluster "$ECS_CLUSTER" --service "$ECS_SERVICE" --task-definition "$TASK_ARN"
          aws ecs wait services-stable --cluster "$ECS_CLUSTER" --services "$ECS_SERVICE"
        '''
      }
    }
  }
  post {
    success { echo "Deploy complete ✅" }
    failure { echo "Deploy failed ❌" }
  }
}
