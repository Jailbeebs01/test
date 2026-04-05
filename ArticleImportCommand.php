<?php
  
class ArticleImportCommand 
{    
    private const MERCHANT_MOTORPROFI = 30001;
  
    private const USED_BIKE_IMPORT_META_KEY = 'used_bike_import_enabled'; 
    private const USED_BIKE_FAMILY_CODES = ['ba_gebrauchtraeder'];
 
    private $importFormat = 'csv' ; 
    private $usedBikeImportPermissionByMerchant = [];
  
    private function isUsedBikeImportRow(array $article, int $merchantId, string $akeneoFamilyCode, \Pegasus_Plugins_Components_ArticleComponent $articleComponent): bool
    {  
        if ($this->isUsedBikeFamilyCode($article['family'] ?? $akeneoFamilyCode)) {
            return true;
        }
        $article['_family'] = $article['_family'] ?? $akeneoFamilyCode;
        $conditionValue = (string)$articleComponent->fetchMappedValue($article, 'condition', $merchantId, true);
        return $this->isUsedConditionValue($conditionValue);
    }

    private function isMerchantAllowedForUsedImport(int $merchantId): bool
    {
        if (\array_key_exists($merchantId, $this->usedBikeImportPermissionByMerchant)) {
            return $this->usedBikeImportPermissionByMerchant[$merchantId];
        }
        $value = Pegasus()->Db()->fetchCell(
            'SELECT `value` FROM meta_data_store WHERE `key` = ? AND `type` = ? AND `foreign_key` = ? LIMIT 1',
            [self::USED_BIKE_IMPORT_META_KEY, 'retailer', $merchantId]
        );
        $parsedValue = \is_string($value) ? trim($value) : $value;
        $isAllowed = true === filter_var($parsedValue, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
        $this->usedBikeImportPermissionByMerchant[$merchantId] = $isAllowed;
        return $isAllowed;
    }

    private function resolveExistingUsedProductByMerchantAndMerchantArticleNumber(int $merchantId, string $merchantArticleNumber): array
    {
        $mapping = Pegasus()->Db()->fetchRow(
            'SELECT tpg_article_sku FROM middleware_mapping WHERE merchant_id = ? AND product_sku = ? LIMIT 1',
            [$merchantId, $merchantArticleNumber]
        );
        if (empty($mapping)) {
            $mongoArticle = Pegasus()->Container()->get(\Pegasus_Plugins_Components_MongodbComponent::class)->getCollection()->findOne(
                [
                    '_merchantId' => (string)$merchantId,
                    '_sku' => $merchantArticleNumber,
                ],
                [
                    'projection' => [
                        '_family' => true,
                        'condition' => true,
                        'ms_condition' => true,
                        'ba_condition' => true,
                    ],
                ]
            );
            if (null !== $mongoArticle && !$this->isUsedProductDocument($mongoArticle)) {
                return [
                    'allowed' => false,
                    'tpg_article_sku' => '',
                    'message' => \sprintf('Gebraucht-Import blockiert: Händler-Artikelnummer %s gehört bereits zu einem Neuware-Artikel.', $merchantArticleNumber),
                ];
            }
            return [
                'allowed' => true,
                'tpg_article_sku' => '',
                'message' => '',
            ];
        }
        $tpgArticleSku = (string)($mapping['tpg_article_sku'] ?? '');
        if ('' === $tpgArticleSku || !$this->isUsedProductByTpgSku($merchantId, $merchantArticleNumber, $tpgArticleSku)) {
            return [
                'allowed' => false,
                'tpg_article_sku' => '',
                'message' => \sprintf('Gebraucht-Import blockiert: Händler-Artikelnummer %s ist einer Neuware zugeordnet.', $merchantArticleNumber),
            ];
        }
        return [
            'allowed' => true,
            'tpg_article_sku' => $tpgArticleSku,
            'message' => '',
        ];
    }

    private function isUsedProductByTpgSku(int $merchantId, string $merchantArticleNumber, string $tpgArticleSku): bool
    {
        $mongoArticle = Pegasus()->Container()->get(\Pegasus_Plugins_Components_MongodbComponent::class)->getCollection()->findOne(
            [
                '_merchantId' => (string)$merchantId,
                '$or' => [
                    [
                        '_sku' => $merchantArticleNumber,
                    ],
                    [
                        '_tpg_article_sku' => $tpgArticleSku,
                    ],
                ],
            ],
            [
                'projection' => [
                    '_family' => true,
                    'condition' => true,
                    'ms_condition' => true,
                    'ba_condition' => true,
                ],
            ]
        );
        if (null !== $mongoArticle && $this->isUsedProductDocument($mongoArticle)) {
            return true;
        }
        $familyCode = (string)Pegasus()->Db()->fetchCell(
            'SELECT family_code FROM tpg_article_cache WHERE tpg_article_sku = ? LIMIT 1',
            [$tpgArticleSku]
        );
        return $this->isUsedBikeFamilyCode($familyCode);
    }

    private function isUsedProductDocument($mongoArticle): bool
    {
        if (isset($mongoArticle['_family']) && $this->isUsedBikeFamilyCode((string)$mongoArticle['_family'])) {
            return true;
        }
        foreach (['condition', 'ms_condition', 'ba_condition'] as $conditionField) {
            if (isset($mongoArticle[$conditionField]) && $this->isUsedConditionValue((string)$mongoArticle[$conditionField])) {
                return true;
            }
        }
        return false;
    }

    private function isUsedBikeFamilyCode(string $familyCode): bool
    {
        $normalizedFamily = strtolower(trim($familyCode));
        if ('' === $normalizedFamily) {
            return false;
        }
        if (\in_array($normalizedFamily, self::USED_BIKE_FAMILY_CODES, true)) {
            return true;
        }
        return false !== strpos($normalizedFamily, 'gebraucht') || false !== strpos($normalizedFamily, 'used');
    }

    private function isUsedConditionValue(string $conditionValue): bool
    {
        $normalizedCondition = strtolower(trim($conditionValue));
        if ('' === $normalizedCondition) {
            return false;
        }
        return \in_array($normalizedCondition, ['used', 'gebraucht', 'gebrauchte', 'preowned', 'pre-owned'], true);
    }
}
