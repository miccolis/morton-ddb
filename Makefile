.PHONY: all
all:
	echo "nothing to make"

.PHONY: stack-update
stack-update:
	@echo Updating ${STACK_NAME}
	aws cloudformation deploy --template-file ./cloudformation/template.json \
		--stack-name ${STACK_NAME} --no-execute-changeset --capabilities CAPABILITY_IAM

.PHONY: code-update
code-update:
	$(eval FUNCTION_ARN := $(shell aws cloudformation describe-stacks \
		--stack-name ${STACK_NAME} --query 'Stacks[0].Outputs[?OutputKey==`LambdaHandlerArn`].OutputValue' \
		--output text))
	@echo Updating ${FUNCTION_ARN}
	npm run bundle
	zip -j dist/bundle.zip dist/index.js
	aws lambda update-function-code --function-name ${FUNCTION_ARN} --zip-file fileb://dist/bundle.zip


.PHONY: web-update
web-update:
	$(eval WEBSITE_BUCKET := $(shell aws cloudformation describe-stacks \
		--stack-name ${STACK_NAME} \
		--query 'Stacks[0].Outputs[?OutputKey==`WebsiteBucket`].OutputValue' \
		--output text))
	@echo Updating ${WEBSITE_BUCKET}
	cd web && bundler exec jekyll build
	aws s3 sync ./web/_site/ s3://${WEBSITE_BUCKET}/ --delete

.PHONY: clean
clean:
	rm dist/index.js dist/bundle.zip
